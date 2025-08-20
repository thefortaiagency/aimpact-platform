import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db/drizzle';
import { emailCampaigns, campaignRecipients, emailContacts } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/email/send - Send campaign emails
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID required' },
        { status: 400 }
      );
    }

    // Get campaign details
    const campaign = await db
      .select()
      .from(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId))
      .limit(1);

    if (campaign.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const campaignData = campaign[0];

    // Get subscribed contacts
    const contacts = await db
      .select()
      .from(emailContacts)
      .where(eq(emailContacts.isSubscribed, true))
      .limit(100); // Limit for demo/testing

    // Update campaign status
    await db
      .update(emailCampaigns)
      .set({
        status: 'sending',
        sentAt: new Date(),
      })
      .where(eq(emailCampaigns.id, campaignId));

    // Send emails (in batches for production)
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const contact of contacts) {
      try {
        // Generate tracking ID
        const trackingId = uuidv4();
        
        // Add tracking pixel and replace links
        let htmlWithTracking = campaignData.htmlContent || '';
        
        // Add tracking pixel
        const trackingPixelUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/track/open/${trackingId}`;
        htmlWithTracking += `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
        
        // Replace links with tracking URLs (simplified for demo)
        // In production, you'd parse HTML and replace all href attributes
        
        // Personalize content
        let personalizedHtml = htmlWithTracking
          .replace(/{{firstName}}/g, contact.firstName || 'Valued Customer')
          .replace(/{{lastName}}/g, contact.lastName || '')
          .replace(/{{email}}/g, contact.email)
          .replace(/{{company}}/g, contact.company || '');

        // Create recipient record
        await db.insert(campaignRecipients).values({
          id: uuidv4(),
          campaignId,
          contactId: contact.id,
          email: contact.email,
          status: 'pending',
          trackingId,
        });

        // Send email via Resend
        const { data, error } = await resend.emails.send({
          from: `${campaignData.fromName} <${campaignData.fromEmail}>`,
          to: contact.email,
          subject: campaignData.subject,
          html: personalizedHtml,
          reply_to: campaignData.replyTo || campaignData.fromEmail,
          headers: {
            'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe?email=${contact.email}&id=${trackingId}>`,
            'X-Campaign-ID': campaignId,
          },
        });

        if (error) {
          throw error;
        }

        // Update recipient status
        await db
          .update(campaignRecipients)
          .set({
            status: 'sent',
            sentAt: new Date(),
            messageId: data?.id,
          })
          .where(eq(campaignRecipients.trackingId, trackingId));

        sentCount++;
      } catch (error) {
        console.error(`Failed to send to ${contact.email}:`, error);
        failedCount++;
        errors.push(`${contact.email}: ${error}`);
      }
    }

    // Update campaign final stats
    await db
      .update(emailCampaigns)
      .set({
        status: 'sent',
        completedAt: new Date(),
        sentCount,
        totalRecipients: contacts.length,
      })
      .where(eq(emailCampaigns.id, campaignId));

    return NextResponse.json({
      success: true,
      message: `Campaign sent successfully`,
      stats: {
        total: contacts.length,
        sent: sentCount,
        failed: failedCount,
      },
      errors: errors.slice(0, 5), // Return first 5 errors
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    return NextResponse.json(
      { error: 'Failed to send campaign' },
      { status: 500 }
    );
  }
}