import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
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

// Helper function to parse email headers
const parseEmailHeaders = (headers: any[]) => {
  const result: any = {};
  headers.forEach(header => {
    const name = header.name.toLowerCase();
    result[name] = header.value;
  });
  return result;
};

// Helper function to decode base64url
const decodeBase64Url = (str: string) => {
  try {
    // Add padding if needed
    const padded = str + '=='.slice((2 - str.length * 3) & 3);
    // Replace URL-safe characters
    const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (error) {
    return str; // Return original if decode fails
  }
};

// Helper function to extract email body
const extractEmailBody = (payload: any): { text: string; html: string } => {
  let text = '';
  let html = '';

  const extractFromPart = (part: any) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      html = decodeBase64Url(part.body.data);
    }
    
    if (part.parts) {
      part.parts.forEach(extractFromPart);
    }
  };

  extractFromPart(payload);
  
  return { text, html };
};

// GET - Fetch emails from Gmail
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'inbox';
    const limit = parseInt(searchParams.get('limit') || '50');
    const pageToken = searchParams.get('pageToken') || undefined;
    const searchQuery = searchParams.get('search') || '';

    // Map .com to .ai since they're aliases of the same mailbox
    let gmailEmail = session.user.email;
    if (gmailEmail === 'aoberlin@thefortaiagency.com') {
      gmailEmail = 'aoberlin@thefortaiagency.ai';
    }

    // Get Gmail client with domain-wide delegation
    const gmail = await getGmailClient(gmailEmail);

    // Build query based on folder
    let query = '';
    switch (folder) {
      case 'inbox':
        query = 'in:inbox';
        break;
      case 'sent':
        query = 'in:sent';
        break;
      case 'drafts':
        query = 'in:drafts';
        break;
      case 'trash':
        query = 'in:trash';
        break;
      case 'archive':
        query = '-in:inbox -in:sent -in:drafts -in:trash';
        break;
      default:
        query = 'in:inbox';
    }

    // Add search query if provided
    if (searchQuery) {
      query += ` ${searchQuery}`;
    }

    // List messages
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: limit,
      pageToken: pageToken
    });

    const messages = messagesResponse.data.messages || [];
    const emails = [];

    // Fetch full details for each message
    for (const message of messages) {
      try {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'
        });

        const headers = parseEmailHeaders(fullMessage.data.payload?.headers || []);
        const { text, html } = extractEmailBody(fullMessage.data.payload);
        
        // Parse sender info
        const fromHeader = headers.from || '';
        const fromMatch = fromHeader.match(/^"?([^"<]*)"?\s*<?([^>]*)>?$/);
        const fromName = fromMatch ? fromMatch[1].trim() : fromHeader;
        const fromEmail = fromMatch ? fromMatch[2].trim() : fromHeader;

        // Check for attachments
        const hasAttachments = fullMessage.data.payload?.parts?.some(
          part => part.filename && part.filename.length > 0
        ) || false;

        // Get attachments info
        const attachments = fullMessage.data.payload?.parts
          ?.filter(part => part.filename && part.filename.length > 0)
          .map(part => ({
            id: part.body?.attachmentId || '',
            name: part.filename || '',
            size: part.body?.size || 0,
            type: part.mimeType || 'application/octet-stream'
          })) || [];

        // Determine folder based on labels
        const labels = fullMessage.data.labelIds || [];
        let emailFolder: string = 'inbox';
        if (labels.includes('SENT')) emailFolder = 'sent';
        else if (labels.includes('DRAFT')) emailFolder = 'drafts';
        else if (labels.includes('TRASH')) emailFolder = 'trash';
        else if (!labels.includes('INBOX')) emailFolder = 'archive';

        emails.push({
          id: fullMessage.data.id,
          threadId: fullMessage.data.threadId,
          from: {
            name: fromName,
            email: fromEmail,
            avatar: '', // Could use Gravatar or initials
            organization: '' // Could extract from domain
          },
          to: headers.to?.split(',').map((e: string) => e.trim()) || [],
          cc: headers.cc?.split(',').map((e: string) => e.trim()) || [],
          bcc: headers.bcc?.split(',').map((e: string) => e.trim()) || [],
          subject: headers.subject || '(No Subject)',
          preview: text.substring(0, 200).replace(/\n/g, ' ').trim(),
          body: text,
          htmlBody: html,
          timestamp: new Date(parseInt(fullMessage.data.internalDate || '0')),
          folder: emailFolder,
          isRead: !labels.includes('UNREAD'),
          isStarred: labels.includes('STARRED'),
          isFlagged: labels.includes('IMPORTANT'),
          hasAttachments,
          attachments,
          labels: labels.filter(l => !['UNREAD', 'STARRED', 'IMPORTANT', 'INBOX', 'SENT', 'DRAFT', 'TRASH'].includes(l)),
          priority: labels.includes('IMPORTANT') ? 'high' : 'normal',
          sentiment: 'neutral' // Could add AI analysis here
        });
      } catch (error) {
        console.error(`Error fetching message ${message.id}:`, error);
        // Continue with other messages
      }
    }

    // Store/update emails in database for offline access
    if (emails.length > 0) {
      const supabase = getSupabaseClient();
      
      // Upsert emails to database
      for (const email of emails) {
        try {
          await supabase
            .from('email_messages')
            .upsert({
              gmail_id: email.id,
              thread_id: email.threadId,
              user_email: session.user.email,
              from_email: email.from.email,
              from_name: email.from.name,
              to_emails: email.to,
              cc_emails: email.cc,
              bcc_emails: email.bcc,
              subject: email.subject,
              body_text: email.body,
              body_html: email.htmlBody,
              folder: email.folder,
              is_read: email.isRead,
              is_starred: email.isStarred,
              is_flagged: email.isFlagged,
              has_attachments: email.hasAttachments,
              attachments: email.attachments,
              labels: email.labels,
              priority: email.priority,
              sentiment: email.sentiment,
              gmail_timestamp: email.timestamp,
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
        } catch (dbError) {
          console.error('Error storing email in database:', dbError);
          // Continue - email fetching should work even if DB storage fails
        }
      }
    }

    return NextResponse.json({
      emails,
      nextPageToken: messagesResponse.data.nextPageToken,
      resultSizeEstimate: messagesResponse.data.resultSizeEstimate
    });

  } catch (error: any) {
    console.error('Error fetching emails:', error);
    
    // Check if it's a delegation error
    if (error.message?.includes('unauthorized_client')) {
      return NextResponse.json({
        error: 'Gmail access not authorized. Please ensure domain-wide delegation is configured.',
        details: 'The service account needs Gmail scopes in Google Admin Console.'
      }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch emails', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Send email via Gmail
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, cc, bcc, subject, body: emailBody, attachments } = body;

    // Validate required fields
    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: to and subject' },
        { status: 400 }
      );
    }

    // Map .com to .ai since they're aliases of the same mailbox
    let gmailEmail = session.user.email;
    if (gmailEmail === 'aoberlin@thefortaiagency.com') {
      gmailEmail = 'aoberlin@thefortaiagency.ai';
    }

    // Get Gmail client
    const gmail = await getGmailClient(gmailEmail);

    // Build email message
    const messageParts = [
      `From: ${gmailEmail}`, // Use the mapped email for sending
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
    ];

    if (cc && cc.length > 0) {
      messageParts.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`);
    }
    if (bcc && bcc.length > 0) {
      messageParts.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`);
    }

    messageParts.push(
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      emailBody || ''
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

    // Store sent email in database
    const supabase = getSupabaseClient();
    await supabase
      .from('email_messages')
      .insert({
        gmail_id: result.data.id,
        thread_id: result.data.threadId,
        user_email: session.user.email,
        from_email: session.user.email,
        from_name: session.user.name || session.user.email,
        to_emails: Array.isArray(to) ? to : [to],
        cc_emails: cc || [],
        bcc_emails: bcc || [],
        subject,
        body_text: emailBody,
        body_html: emailBody,
        folder: 'sent',
        is_read: true,
        is_starred: false,
        is_flagged: false,
        has_attachments: false,
        gmail_timestamp: new Date(),
        created_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      messageId: result.data.id,
      threadId: result.data.threadId
    });

  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}