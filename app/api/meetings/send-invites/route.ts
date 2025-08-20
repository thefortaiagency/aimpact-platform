import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { format } from 'date-fns';
import { canUserSendFrom, getDefaultSenderEmail } from '@/lib/email-config';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

// Initialize Supabase
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Generate ICS calendar file content
function generateICS(meeting: any): string {
  const startDate = new Date(`${meeting.date}T${meeting.time}`);
  const endDate = new Date(startDate.getTime() + meeting.duration * 60000);
  
  const formatDateForICS = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Impact Nexus//Meeting Scheduler//EN
METHOD:REQUEST
BEGIN:VEVENT
UID:${meeting.id}@impactnexus.com
DTSTAMP:${formatDateForICS(new Date())}
DTSTART:${formatDateForICS(startDate)}
DTEND:${formatDateForICS(endDate)}
SUMMARY:${meeting.title}
DESCRIPTION:${meeting.description || ''}
LOCATION:${meeting.location || meeting.meetingUrl || ''}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  return icsContent;
}

// Generate HTML email template
function generateEmailHTML(meeting: any, attendeeName: string): string {
  const meetingDate = format(new Date(meeting.date), 'MMMM d, yyyy');
  const meetingTypeIcon = meeting.type === 'video' ? '🎥' : meeting.type === 'phone' ? '📞' : '📍';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Invitation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
    .content { background: white; padding: 30px; border: 1px solid #e1e4e8; border-radius: 0 0 10px 10px; }
    .meeting-details { background: #f6f8fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e1e4e8; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-weight: 600; min-width: 120px; color: #586069; }
    .detail-value { flex: 1; color: #24292e; }
    .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 5px; }
    .button.secondary { background: #6c757d; }
    .footer { text-align: center; padding: 20px; color: #586069; font-size: 14px; }
    .icon { font-size: 48px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="icon">${meetingTypeIcon}</div>
      <h1>Meeting Invitation</h1>
    </div>
    
    <div class="content">
      <p>Dear ${attendeeName},</p>
      
      <p>You have been invited to the following meeting:</p>
      
      <div class="meeting-details">
        <div class="detail-row">
          <div class="detail-label">Title:</div>
          <div class="detail-value"><strong>${meeting.title}</strong></div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Date:</div>
          <div class="detail-value">${meetingDate}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Time:</div>
          <div class="detail-value">${meeting.time}</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Duration:</div>
          <div class="detail-value">${meeting.duration} minutes</div>
        </div>
        
        <div class="detail-row">
          <div class="detail-label">Type:</div>
          <div class="detail-value">${meeting.type === 'video' ? 'Video Call' : meeting.type === 'phone' ? 'Phone Call' : 'In Person'}</div>
        </div>
        
        ${meeting.meetingUrl ? `
        <div class="detail-row">
          <div class="detail-label">Meeting Link:</div>
          <div class="detail-value"><a href="${meeting.meetingUrl}" style="color: #667eea;">${meeting.meetingUrl}</a></div>
        </div>
        ` : ''}
        
        ${meeting.location ? `
        <div class="detail-row">
          <div class="detail-label">Location:</div>
          <div class="detail-value">${meeting.location}</div>
        </div>
        ` : ''}
      </div>
      
      ${meeting.description ? `
      <div style="margin: 20px 0;">
        <h3 style="color: #24292e; margin-bottom: 10px;">Description</h3>
        <p style="color: #586069; white-space: pre-wrap;">${meeting.description}</p>
      </div>
      ` : ''}
      
      ${meeting.notes ? `
      <div style="margin: 20px 0;">
        <h3 style="color: #24292e; margin-bottom: 10px;">Additional Notes</h3>
        <p style="color: #586069; white-space: pre-wrap;">${meeting.notes}</p>
      </div>
      ` : ''}
      
      <div style="text-align: center; margin: 30px 0;">
        ${meeting.meetingUrl ? `
        <a href="${meeting.meetingUrl}" class="button">Join Meeting</a>
        ` : ''}
        <a href="mailto:${meeting.organizerEmail}?subject=Re: ${meeting.title}" class="button secondary">Contact Organizer</a>
      </div>
      
      <p style="color: #586069; font-size: 14px;">
        Please confirm your attendance by replying to this email. If you need to reschedule or have any questions, please don't hesitate to reach out.
      </p>
    </div>
    
    <div class="footer">
      <p>This invitation was sent from Impact Nexus</p>
      <p>© ${new Date().getFullYear()} Impact Nexus. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Get Gmail client for sending emails
const getGmailClient = async (userEmail: string) => {
  // Load service account credentials
  let serviceAccountKey;
  
  // Try to load from environment variable first
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  } else {
    // Fall back to file
    const keyPath = path.join(process.cwd(), 'credentials', 'gmail-service-account.json');
    if (fs.existsSync(keyPath)) {
      serviceAccountKey = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    } else {
      throw new Error('Service account credentials not found');
    }
  }

  // Create JWT client with domain-wide delegation
  const jwtClient = new google.auth.JWT({
    email: serviceAccountKey.client_email,
    key: serviceAccountKey.private_key,
    scopes: [
      'https://www.googleapis.com/auth/gmail.send',
    ],
    subject: userEmail // Impersonate the user
  });

  // Authorize the client
  await jwtClient.authorize();

  // Create Gmail client
  return google.gmail({ version: 'v1', auth: jwtClient });
};

async function sendEmail(to: string, subject: string, html: string, fromEmail?: string, icsContent?: string) {
  try {
    // Use provided email or default
    const senderEmail = fromEmail || 'aoberlin@aimpactnexus.ai';
    
    // Map .com to .ai for Gmail aliases
    let gmailEmail = senderEmail;
    if (gmailEmail === 'aoberlin@thefortaiagency.com') {
      gmailEmail = 'aoberlin@thefortaiagency.ai';
    }
    
    console.log('[Send Invites] Sending email from:', gmailEmail, 'to:', to);
    
    // Get Gmail client
    const gmail = await getGmailClient(gmailEmail);
    
    // Build email message
    const messageParts = [
      `From: ${gmailEmail}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
    ];
    
    if (icsContent) {
      // With attachment
      const boundary = `boundary_${Date.now()}`;
      messageParts.push(
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        '',
        html,
        `--${boundary}`,
        'Content-Type: text/calendar; charset=utf-8; name="meeting.ics"',
        'Content-Transfer-Encoding: base64',
        'Content-Disposition: attachment; filename="meeting.ics"',
        '',
        Buffer.from(icsContent).toString('base64'),
        `--${boundary}--`
      );
    } else {
      // No attachment
      messageParts.push(
        'Content-Type: text/html; charset=utf-8',
        '',
        html
      );
    }
    
    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send the email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });
    
    console.log('[Send Invites] Email sent successfully:', result.data.id);
    return true;
  } catch (error) {
    console.error('[Send Invites] Error sending email:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, meeting, attendees, fromEmail } = body;

    if (!meeting || !attendees || attendees.length === 0) {
      return NextResponse.json(
        { error: 'Meeting details and attendees required' },
        { status: 400 }
      );
    }
    
    // Validate sender email
    let senderEmail: string;
    if (fromEmail) {
      if (!canUserSendFrom(session.user.email, fromEmail)) {
        return NextResponse.json(
          { error: 'You are not authorized to send from this email address' },
          { status: 403 }
        );
      }
      senderEmail = fromEmail;
    } else {
      senderEmail = getDefaultSenderEmail(session.user.email);
    }

    const supabase = getSupabaseClient();

    // Add organizer email if not present
    const meetingWithOrganizer = {
      ...meeting,
      organizerEmail: session.user.email
    };

    // Generate ICS file content
    const icsContent = generateICS(meetingWithOrganizer);

    // Send emails to all attendees
    const emailPromises = attendees.map(async (attendee: any) => {
      const attendeeName = attendee.name || attendee.email.split('@')[0];
      const subject = `Meeting Invitation: ${meeting.title}`;
      const html = generateEmailHTML(meetingWithOrganizer, attendeeName);
      
      const sent = await sendEmail(attendee.email, subject, html, senderEmail, icsContent);
      
      // Update attendee status if meeting ID provided
      if (meetingId && sent) {
        await supabase
          .from('meeting_attendees')
          .update({ 
            invite_sent: true,
            invite_sent_at: new Date().toISOString()
          })
          .eq('meeting_id', meetingId)
          .eq('email', attendee.email);
      }
      
      return { email: attendee.email, sent };
    });

    const results = await Promise.all(emailPromises);
    
    // Log activity
    if (meetingId) {
      await supabase
        .from('activities')
        .insert({
          type: 'meeting_invites_sent',
          description: `Sent invitations for: ${meeting.title}`,
          entity_type: 'meeting',
          entity_id: meetingId,
          metadata: {
            attendeeCount: attendees.length,
            successCount: results.filter(r => r.sent).length
          }
        });
    }

    const successCount = results.filter(r => r.sent).length;
    const failedCount = results.filter(r => !r.sent).length;

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failedCount,
      results
    });
  } catch (error) {
    console.error('Error sending meeting invites:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    );
  }
}