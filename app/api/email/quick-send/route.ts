import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

// Get Gmail client using domain-wide delegation
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
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
    subject: userEmail // Impersonate the user
  });

  // Authorize the client
  await jwtClient.authorize();

  // Create Gmail client
  const gmail = google.gmail({ version: 'v1', auth: jwtClient });
  
  return gmail;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    
    const from = formData.get('from') as string;
    const to = JSON.parse(formData.get('to') as string || '[]');
    const cc = JSON.parse(formData.get('cc') as string || '[]');
    const bcc = JSON.parse(formData.get('bcc') as string || '[]');
    const subject = formData.get('subject') as string;
    const body = formData.get('body') as string;
    const priority = formData.get('priority') as string || 'normal';
    
    if (!to.length || !subject || !body) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Map .com to .ai since they're aliases of the same mailbox
    let gmailEmail = from || session.user.email;
    if (gmailEmail === 'aoberlin@thefortaiagency.com') {
      gmailEmail = 'aoberlin@thefortaiagency.ai';
    }

    console.log('[Quick Send] Using Gmail email:', gmailEmail);

    // Get Gmail client
    const gmail = await getGmailClient(gmailEmail);

    // Create HTML version of the email
    const htmlBody = body
      .split('\n')
      .map(line => `<p>${line || '&nbsp;'}</p>`)
      .join('');

    // Build email message
    const messageParts = [
      `From: ${gmailEmail}`,
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
    ];

    if (cc && cc.length > 0) {
      messageParts.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`);
    }
    if (bcc && bcc.length > 0) {
      messageParts.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`);
    }

    // Add priority header if high priority
    if (priority === 'high') {
      messageParts.push('X-Priority: 1');
      messageParts.push('Importance: High');
    }

    messageParts.push(
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
        ${priority === 'high' ? '<p style="color: #ff0000; font-weight: bold;">HIGH PRIORITY</p>' : ''}
        ${htmlBody}
        <br/>
        <p style="color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
          Sent from AImpact Nexus Platform<br/>
          ${gmailEmail}
        </p>
      </div>`
    );

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

    console.log('[Quick Send] Email sent successfully:', result.data.id);

    // Store sent email in database
    try {
      const supabase = getSupabaseClient();
      await supabase
        .from('email_messages')
        .insert({
          gmail_id: result.data.id,
          thread_id: result.data.threadId,
          user_email: session.user.email,
          from_email: gmailEmail,
          from_name: session.user.name || gmailEmail,
          to_emails: Array.isArray(to) ? to : [to],
          cc_emails: cc || [],
          bcc_emails: bcc || [],
          subject,
          body_text: body,
          body_html: htmlBody,
          folder: 'sent',
          is_read: true,
          is_starred: false,
          is_flagged: priority === 'high',
          has_attachments: false,
          priority: priority,
          gmail_timestamp: new Date(),
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.error('[Quick Send] Error storing email in database:', dbError);
      // Continue - email was sent successfully even if DB storage failed
    }

    return NextResponse.json({ 
      success: true, 
      messageId: result.data.id,
      threadId: result.data.threadId,
      message: 'Email sent successfully via Gmail' 
    });
  } catch (error: any) {
    console.error('[Quick Send] Error sending email:', error);
    
    // Check if it's a delegation error
    if (error.message?.includes('unauthorized_client')) {
      return NextResponse.json({
        error: 'Gmail access not authorized. Please ensure domain-wide delegation is configured.',
        details: 'The service account needs Gmail scopes in Google Admin Console.'
      }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}