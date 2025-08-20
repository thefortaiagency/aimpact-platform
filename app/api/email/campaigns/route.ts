import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db/drizzle';
import { emailCampaigns, campaignRecipients, emailContacts, listMemberships } from '@/lib/db/schema';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// GET /api/email/campaigns - Fetch all campaigns
export async function GET(request: NextRequest) {
  try {
    // For now, allow unauthenticated access for internal API calls
    // In production, implement proper service-to-service auth

    // Fetch campaigns with computed stats
    const campaigns = await db
      .select({
        id: emailCampaigns.id,
        name: emailCampaigns.name,
        subject: emailCampaigns.subject,
        status: emailCampaigns.status,
        scheduledAt: emailCampaigns.scheduledAt,
        sentAt: emailCampaigns.sentAt,
        completedAt: emailCampaigns.completedAt,
        stats: {
          recipients: emailCampaigns.totalRecipients,
          sent: emailCampaigns.sentCount,
          delivered: emailCampaigns.deliveredCount,
          opened: emailCampaigns.openedCount,
          clicked: emailCampaigns.clickedCount,
          bounced: emailCampaigns.bouncedCount,
          unsubscribed: emailCampaigns.unsubscribedCount,
        },
        rates: {
          open: emailCampaigns.openRate,
          click: emailCampaigns.clickRate,
          bounce: emailCampaigns.bounceRate,
          unsubscribe: emailCampaigns.unsubscribeRate,
        },
        createdAt: emailCampaigns.createdAt,
        updatedAt: emailCampaigns.updatedAt,
      })
      .from(emailCampaigns)
      .orderBy(desc(emailCampaigns.createdAt))
      .limit(50);

    // Transform the data to match the frontend interface
    const formattedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      subject: campaign.subject,
      status: campaign.status,
      scheduledAt: campaign.scheduledAt?.toISOString(),
      sentAt: campaign.sentAt?.toISOString(),
      stats: {
        recipients: campaign.stats.recipients || 0,
        sent: campaign.stats.sent || 0,
        delivered: campaign.stats.delivered || 0,
        opened: campaign.stats.opened || 0,
        clicked: campaign.stats.clicked || 0,
        bounced: campaign.stats.bounced || 0,
        unsubscribed: campaign.stats.unsubscribed || 0,
      },
      rates: {
        open: campaign.rates.open || 0,
        click: campaign.rates.click || 0,
        bounce: campaign.rates.bounce || 0,
        unsubscribe: campaign.rates.unsubscribe || 0,
      }
    }));

    return NextResponse.json(formattedCampaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// POST /api/email/campaigns - Create new campaign
export async function POST(request: NextRequest) {
  try {
    // For now, allow unauthenticated access for internal API calls
    // In production, implement proper service-to-service auth
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || 'system';

    const body = await request.json();
    const {
      name,
      subject,
      previewText,
      fromName,
      fromEmail,
      replyTo,
      content,
      targetList,
      scheduleType,
      scheduleDate,
      scheduleTime,
    } = body;

    // Validate required fields
    if (!name || !subject || !fromName || !fromEmail || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Calculate scheduled time if needed
    let scheduledAt = null;
    if (scheduleType === 'scheduled' && scheduleDate && scheduleTime) {
      scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`);
    }

    // Get target recipients count
    let recipientCount = 0;
    if (targetList === 'all') {
      const subscribedContacts = await db
        .select({ id: emailContacts.id })
        .from(emailContacts)
        .where(eq(emailContacts.isSubscribed, true));
      recipientCount = subscribedContacts.length;
    } else if (targetList === 'engaged') {
      // Get contacts engaged in last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const engagedContacts = await db
        .select({ id: emailContacts.id })
        .from(emailContacts)
        .where(
          and(
            eq(emailContacts.isSubscribed, true),
            // In a real implementation, check lastEngagedAt > thirtyDaysAgo
          )
        );
      recipientCount = engagedContacts.length;
    }

    // Create the campaign
    const campaignId = uuidv4();
    const newCampaign = await db.insert(emailCampaigns).values({
      id: campaignId,
      name,
      subject,
      previewText,
      fromName,
      fromEmail,
      replyTo: replyTo || fromEmail,
      htmlContent: content,
      plainTextContent: content.replace(/<[^>]*>/g, ''), // Simple HTML strip
      status: scheduleType === 'now' ? 'sending' : 'scheduled',
      scheduledAt,
      totalRecipients: recipientCount,
      createdBy: userId,
    }).returning();

    // If sending immediately, trigger the send process
    if (scheduleType === 'now') {
      // In production, this would trigger an async job
      // For now, we'll just update the status
      setTimeout(async () => {
        await db
          .update(emailCampaigns)
          .set({ 
            status: 'sent',
            sentAt: new Date(),
            completedAt: new Date(),
            sentCount: recipientCount,
            deliveredCount: Math.floor(recipientCount * 0.98), // Mock 98% delivery
            openedCount: Math.floor(recipientCount * 0.25), // Mock 25% open rate
            clickedCount: Math.floor(recipientCount * 0.03), // Mock 3% click rate
            openRate: 25.0,
            clickRate: 3.0,
            bounceRate: 2.0,
          })
          .where(eq(emailCampaigns.id, campaignId));
      }, 2000);
    }

    return NextResponse.json({
      id: campaignId,
      message: 'Campaign created successfully',
      status: scheduleType === 'now' ? 'sending' : 'scheduled',
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}

// DELETE /api/email/campaigns/[id] - Delete campaign
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const campaignId = url.pathname.split('/').pop();

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID required' },
        { status: 400 }
      );
    }

    await db
      .delete(emailCampaigns)
      .where(eq(emailCampaigns.id, campaignId));

    return NextResponse.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}