import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/auth';

// Initialize Gmail client
const getGmailClient = async (userEmail: string) => {
  try {
    const serviceAccountKey = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 
      JSON.stringify(require('@/credentials/gmail-service-account.json'))
    );

    const jwtClient = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: [
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      subject: userEmail
    });

    await jwtClient.authorize();
    return google.gmail({ version: 'v1', auth: jwtClient });
  } catch (error: any) {
    console.error('Failed to create Gmail client:', error);
    throw error;
  }
};

// Fetch Gmail signature for user
const fetchGmailSignature = async (gmail: any, userEmail: string): Promise<string> => {
  try {
    // Get the send-as settings which includes signatures
    const sendAsResponse = await gmail.users.settings.sendAs.list({
      userId: 'me'
    });
    
    const sendAsAddresses = sendAsResponse.data.sendAs || [];
    
    // Find the exact address matching userEmail
    const matchingAddress = sendAsAddresses.find((addr: any) => 
      addr.sendAsEmail === userEmail
    );
    
    if (matchingAddress && matchingAddress.signature) {
      // Gmail signatures are already in HTML format
      console.log('[Gmail] Found signature for:', matchingAddress.sendAsEmail);
      console.log('[Gmail] Signature HTML:', matchingAddress.signature.substring(0, 200) + '...');
      return matchingAddress.signature;
    }
    
    // If no exact match, try to find the primary address
    const primaryAddress = sendAsAddresses.find((addr: any) => addr.isPrimary);
    
    if (primaryAddress && primaryAddress.signature && userEmail === 'aoberlin@thefortaiagency.ai') {
      console.log('[Gmail] Using primary signature for:', userEmail);
      return primaryAddress.signature;
    }
    
    console.log('[Gmail] No signature found, using default');
    // Return a properly formatted default signature if Gmail signature not available
    // Adjust company name based on email domain
    const companyName = userEmail.includes('@aimpactnexus.ai') ? 'AImpact Nexus' : 'The Fort AI Agency';
    const website = userEmail.includes('@aimpactnexus.ai') ? 'https://aimpactnexus.ai' : 'https://thefortaiagency.ai';
    
    const defaultSignature = `
<br>
<br>
--<br>
<div dir="ltr" style="font-family: Arial, sans-serif; font-size: 14px; color: #444;">
  <div style="font-weight: bold; color: #222;">Andy Oberlin</div>
  <div style="color: #666;">CEO & Founder</div>
  <div style="color: #666;">${companyName}</div>
  <div style="margin-top: 8px;">
    <div style="color: #666;">Email: <a href="mailto:${userEmail}" style="color: #1155cc;">${userEmail}</a></div>
    <div style="color: #666;">Phone: (260) 452-7615</div>
    <div style="color: #666;">Web: <a href="${website}" style="color: #1155cc;">${website}</a></div>
    <div style="color: #666;">LinkedIn: <a href="https://linkedin.com/in/andyoberlin" style="color: #1155cc;">https://linkedin.com/in/andyoberlin</a></div>
  </div>
</div>`;
    return defaultSignature;
  } catch (error) {
    console.error('Failed to fetch Gmail signature:', error);
    // Return default signature on error
    const companyName = userEmail.includes('@aimpactnexus.ai') ? 'AImpact Nexus' : 'The Fort AI Agency';
    const website = userEmail.includes('@aimpactnexus.ai') ? 'https://aimpactnexus.ai' : 'https://thefortaiagency.ai';
    
    const defaultSignature = `
<br>
<br>
--<br>
<div dir="ltr" style="font-family: Arial, sans-serif; font-size: 14px; color: #444;">
  <div style="font-weight: bold; color: #222;">Andy Oberlin</div>
  <div style="color: #666;">CEO & Founder</div>
  <div style="color: #666;">${companyName}</div>
  <div style="margin-top: 8px;">
    <div style="color: #666;">Email: <a href="mailto:${userEmail}" style="color: #1155cc;">${userEmail}</a></div>
    <div style="color: #666;">Phone: (260) 452-7615</div>
    <div style="color: #666;">Web: <a href="${website}" style="color: #1155cc;">${website}</a></div>
    <div style="color: #666;">LinkedIn: <a href="https://linkedin.com/in/andyoberlin" style="color: #1155cc;">https://linkedin.com/in/andyoberlin</a></div>
  </div>
</div>`;
    return defaultSignature;
  }
};

// Helper to create email message
function createEmailMessage(to: string, subject: string, body: string, from: string, signature: string = '', cc?: string, bcc?: string): string {
  const headers = [
    `To: ${to}`,
    `From: ${from}`,
    `Subject: ${subject}`,
    cc ? `Cc: ${cc}` : null,
    bcc ? `Bcc: ${bcc}` : null,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0'
  ].filter(Boolean).join('\r\n');

  // Convert plain text body to HTML if needed
  let htmlBody = body;
  if (!body.includes('<') || !body.includes('>')) {
    // Body seems to be plain text, convert to HTML
    htmlBody = body.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '<br>').join('');
  }

  // Add signature if provided
  let finalBody = htmlBody;
  if (signature) {
    // Ensure there's proper spacing before signature
    if (!htmlBody.endsWith('<br>') && !htmlBody.endsWith('</p>')) {
      finalBody = htmlBody + '<br><br>';
    } else {
      finalBody = htmlBody + '<br>';
    }
    
    // Add the signature (already in HTML format from Gmail)
    finalBody += signature;
  }

  // Wrap in basic HTML structure if not already wrapped
  if (!finalBody.includes('<html>') && !finalBody.includes('<body>')) {
    finalBody = `<html><body>${finalBody}</body></html>`;
  }

  const message = `${headers}\r\n\r\n${finalBody}`;
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// POST - Send new email
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const body = await request.json();
    
    // Allow specifying which email to send from
    const userEmail = body.from || 'aoberlin@thefortaiagency.ai';
    
    const { 
      to,
      subject,
      body: emailBody,
      cc,
      bcc,
      saveToSent = true
    } = body;
    
    if (!to || !subject || !emailBody) {
      return NextResponse.json({
        success: false,
        error: 'To, subject, and body are required'
      }, { status: 400 });
    }
    
    const gmail = await getGmailClient(userEmail);
    
    // Fetch the user's Gmail signature
    const signature = await fetchGmailSignature(gmail, userEmail);
    
    // Create email message with signature
    const rawMessage = createEmailMessage(to, subject, emailBody, userEmail, signature, cc, bcc);
    
    // Send the email
    const sendResponse = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: rawMessage
      }
    });
    
    const sentMessage = sendResponse.data;
    
    return NextResponse.json({
      success: true,
      messageId: sentMessage.id,
      threadId: sentMessage.threadId,
      message: 'Email sent successfully',
      details: {
        to,
        subject,
        sentAt: new Date().toISOString(),
        from: userEmail
      }
    });
    
  } catch (error: any) {
    console.error('Send email error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send email'
    }, { status: 500 });
  }
}

// PUT - Save draft or update draft
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = 'aoberlin@thefortaiagency.ai';
    
    const body = await request.json();
    const { 
      to,
      subject,
      body: emailBody,
      cc,
      bcc,
      draftId // If updating existing draft
    } = body;
    
    if (!to && !subject && !emailBody) {
      return NextResponse.json({
        success: false,
        error: 'At least one field (to, subject, or body) is required for draft'
      }, { status: 400 });
    }
    
    const gmail = await getGmailClient(userEmail);
    
    // Fetch the user's Gmail signature for drafts
    const signature = await fetchGmailSignature(gmail, userEmail);
    
    // Create draft message with signature
    const rawMessage = createEmailMessage(
      to || '', 
      subject || '(No subject)', 
      emailBody || '', 
      userEmail, 
      signature,
      cc, 
      bcc
    );
    
    let draftResponse;
    
    if (draftId) {
      // Update existing draft
      draftResponse = await gmail.users.drafts.update({
        userId: 'me',
        id: draftId,
        requestBody: {
          message: {
            raw: rawMessage
          }
        }
      });
    } else {
      // Create new draft
      draftResponse = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: rawMessage
          }
        }
      });
    }
    
    const draft = draftResponse.data;
    
    return NextResponse.json({
      success: true,
      draftId: draft.id,
      messageId: draft.message?.id,
      message: draftId ? 'Draft updated successfully' : 'Draft saved successfully',
      details: {
        to: to || '',
        subject: subject || '(No subject)',
        savedAt: new Date().toISOString(),
        from: userEmail
      }
    });
    
  } catch (error: any) {
    console.error('Save draft error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to save draft'
    }, { status: 500 });
  }
}

// GET - Get draft or template
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');
    const action = searchParams.get('action'); // 'drafts' or 'templates'
    
    const gmail = await getGmailClient(userEmail);
    
    if (draftId) {
      // Get specific draft
      const draftResponse = await gmail.users.drafts.get({
        userId: 'me',
        id: draftId,
        format: 'full'
      });
      
      const draft = draftResponse.data;
      const message = draft.message;
      const payload = message?.payload;
      const headers = payload?.headers || [];
      
      // Extract headers
      const getHeader = (name: string) => 
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
      
      // Extract body
      let body = '';
      if (payload?.parts) {
        const htmlPart = payload.parts.find(part => part.mimeType === 'text/html') ||
                         payload.parts.find(part => part.mimeType === 'text/plain');
        if (htmlPart?.body?.data) {
          body = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
        }
      } else if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      }
      
      return NextResponse.json({
        success: true,
        draft: {
          id: draft.id,
          messageId: message?.id,
          to: getHeader('to'),
          from: getHeader('from'),
          subject: getHeader('subject'),
          body: body,
          cc: getHeader('cc'),
          bcc: getHeader('bcc'),
          updatedAt: new Date(parseInt(message?.internalDate || '0')).toISOString()
        }
      });
      
    } else if (action === 'drafts') {
      // Get all drafts
      const draftsResponse = await gmail.users.drafts.list({
        userId: 'me',
        maxResults: 20
      });
      
      const drafts = draftsResponse.data.drafts || [];
      
      // Get details for each draft
      const draftDetails = await Promise.all(
        drafts.slice(0, 10).map(async (draft) => { // Limit to 10 for performance
          try {
            const draftDetail = await gmail.users.drafts.get({
              userId: 'me',
              id: draft.id!,
              format: 'metadata'
            });
            
            const message = draftDetail.data.message;
            const headers = message?.payload?.headers || [];
            
            const getHeader = (name: string) => 
              headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';
            
            return {
              id: draft.id,
              messageId: message?.id,
              to: getHeader('to'),
              subject: getHeader('subject') || '(No subject)',
              updatedAt: new Date(parseInt(message?.internalDate || '0')).toISOString()
            };
            
          } catch (error) {
            console.error(`Error fetching draft ${draft.id}:`, error);
            return null;
          }
        })
      );
      
      const validDrafts = draftDetails.filter(draft => draft !== null);
      
      return NextResponse.json({
        success: true,
        drafts: validDrafts,
        count: validDrafts.length
      });
      
    } else {
      // Return email templates
      const templates = [
        {
          id: 'template_1',
          name: 'Professional Follow-up',
          subject: 'Following up on our conversation',
          body: `<p>Hi {{recipient_name}},</p>
                 <p>I wanted to follow up on our recent conversation about {{topic}}.</p>
                 <p>Please let me know if you have any questions or if there's anything else I can help with.</p>
                 <p>Best regards,<br>{{sender_name}}</p>`
        },
        {
          id: 'template_2',
          name: 'Meeting Request',
          subject: 'Meeting Request - {{meeting_topic}}',
          body: `<p>Hi {{recipient_name}},</p>
                 <p>I'd like to schedule a meeting to discuss {{meeting_topic}}.</p>
                 <p>Are you available for a {{duration}} minute call sometime {{timeframe}}?</p>
                 <p>Please let me know what works best for your schedule.</p>
                 <p>Thanks,<br>{{sender_name}}</p>`
        },
        {
          id: 'template_3',
          name: 'Thank You',
          subject: 'Thank you - {{reason}}',
          body: `<p>Hi {{recipient_name}},</p>
                 <p>Thank you for {{reason}}. I really appreciate {{specific_appreciation}}.</p>
                 <p>Looking forward to {{next_steps}}.</p>
                 <p>Best regards,<br>{{sender_name}}</p>`
        }
      ];
      
      return NextResponse.json({
        success: true,
        templates,
        count: templates.length
      });
    }
    
  } catch (error: any) {
    console.error('Get compose data error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get compose data'
    }, { status: 500 });
  }
}

// DELETE - Delete draft
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const { searchParams } = new URL(request.url);
    const draftId = searchParams.get('draftId');
    
    if (!draftId) {
      return NextResponse.json({
        success: false,
        error: 'Draft ID is required'
      }, { status: 400 });
    }
    
    const gmail = await getGmailClient(userEmail);
    
    await gmail.users.drafts.delete({
      userId: 'me',
      id: draftId
    });
    
    return NextResponse.json({
      success: true,
      message: 'Draft deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Delete draft error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete draft'
    }, { status: 500 });
  }
}