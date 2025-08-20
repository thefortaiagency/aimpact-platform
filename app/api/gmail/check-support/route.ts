import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

// Initialize Gmail client
const getGmailClient = async () => {
  // Using service account for domain-wide delegation
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      project_id: process.env.GOOGLE_PROJECT_ID,
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      client_id: process.env.GOOGLE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.GOOGLE_CERT_URL
    },
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.send'
    ],
    subject: 'support@thefortaiagency.ai' // Impersonate support account
  });

  const gmail = google.gmail({ version: 'v1', auth });
  return gmail;
};

export async function GET(request: NextRequest) {
  try {
    console.log('📧 Checking Gmail for new support emails...');
    
    const gmail = await getGmailClient();
    
    // Search for unread emails to support
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread to:support@thefortaiagency.ai OR to:support@thefortaiagency.com',
      maxResults: 10
    });
    
    const messages = response.data.messages || [];
    console.log(`Found ${messages.length} unread support emails`);
    
    const processedEmails = [];
    
    for (const message of messages) {
      if (!message.id) continue;
      
      // Get full message details
      const fullMessage = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });
      
      // Extract email data
      const headers = fullMessage.data.payload?.headers || [];
      const getHeader = (name: string) => 
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
      
      const emailData = {
        messageId: fullMessage.data.id,
        threadId: fullMessage.data.threadId,
        from: getHeader('from'),
        to: getHeader('to'),
        subject: getHeader('subject'),
        date: getHeader('date'),
        text: '',
        html: ''
      };
      
      // Extract body
      const extractBody = (payload: any): { text: string; html: string } => {
        let text = '';
        let html = '';
        
        if (payload.body?.data) {
          const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
          if (payload.mimeType === 'text/plain') {
            text = decoded;
          } else if (payload.mimeType === 'text/html') {
            html = decoded;
          }
        }
        
        if (payload.parts) {
          for (const part of payload.parts) {
            const partBody = extractBody(part);
            text = text || partBody.text;
            html = html || partBody.html;
          }
        }
        
        return { text, html };
      };
      
      const body = extractBody(fullMessage.data.payload);
      emailData.text = body.text;
      emailData.html = body.html;
      
      console.log(`Processing email from ${emailData.from}: ${emailData.subject}`);
      
      // Forward to our email ingestion endpoint
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const ingestionResponse = await fetch(`${baseUrl}/api/aimpact/email-ingestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true'
        },
        body: JSON.stringify(emailData)
      });
      
      if (ingestionResponse.ok) {
        const result = await ingestionResponse.json();
        
        // Mark as read in Gmail
        await gmail.users.messages.modify({
          userId: 'me',
          id: message.id,
          requestBody: {
            removeLabelIds: ['UNREAD']
          }
        });
        
        // Add label to indicate processed
        try {
          // First try to get or create the label
          const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
          let labelId = labelsResponse.data.labels?.find(
            l => l.name === 'Nexus-Processed'
          )?.id;
          
          if (!labelId) {
            // Create label if it doesn't exist
            const newLabel = await gmail.users.labels.create({
              userId: 'me',
              requestBody: {
                name: 'Nexus-Processed',
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show'
              }
            });
            labelId = newLabel.data.id;
          }
          
          if (labelId) {
            await gmail.users.messages.modify({
              userId: 'me',
              id: message.id,
              requestBody: {
                addLabelIds: [labelId]
              }
            });
          }
        } catch (labelError) {
          console.log('Could not add label:', labelError);
        }
        
        processedEmails.push({
          messageId: emailData.messageId,
          from: emailData.from,
          subject: emailData.subject,
          ticketId: result.ticketId,
          autoResponded: result.autoResponded
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      checked: messages.length,
      processed: processedEmails.length,
      emails: processedEmails
    });
    
  } catch (error) {
    console.error('Gmail check error:', error);
    return NextResponse.json(
      { error: 'Failed to check Gmail', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST method to manually trigger check
export async function POST(request: NextRequest) {
  return GET(request);
}