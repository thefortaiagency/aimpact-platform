import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import OpenAI from 'openai';

// Initialize OpenAI
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
};

// Initialize Gmail client with service account
const getGmailClient = async (userEmail: string) => {
  try {
    // Load service account credentials
    const serviceAccountKey = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY || 
      JSON.stringify(require('@/credentials/gmail-service-account.json'))
    );

    // Create JWT client
    const jwtClient = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      subject: userEmail // Impersonate the user (requires domain-wide delegation)
    });

    // Authorize the client
    await jwtClient.authorize();

    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: jwtClient });
    
    return gmail;
  } catch (error: any) {
    console.error('Failed to create Gmail client:', error);
    throw error;
  }
};

// Helper to decode email body
const decodeEmailBody = (body: any): string => {
  let data = '';
  
  if (body.data) {
    data = body.data;
  } else if (body.parts) {
    for (const part of body.parts) {
      if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
        data = part.body.data || '';
        break;
      }
      if (part.parts) {
        const nestedData = decodeEmailBody(part);
        if (nestedData) {
          data = nestedData;
          break;
        }
      }
    }
  }
  
  if (data) {
    return Buffer.from(data, 'base64').toString('utf-8');
  }
  
  return '';
};

// Helper to extract email metadata
const extractEmailMetadata = (headers: any[]) => {
  const metadata: any = {};
  
  headers.forEach(header => {
    switch (header.name.toLowerCase()) {
      case 'from':
        metadata.from = header.value;
        break;
      case 'to':
        metadata.to = header.value;
        break;
      case 'subject':
        metadata.subject = header.value;
        break;
      case 'date':
        metadata.date = header.value;
        break;
      case 'cc':
        metadata.cc = header.value;
        break;
    }
  });
  
  return metadata;
};

// GET - Fetch and analyze inbox
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'is:unread';
    const maxResults = parseInt(searchParams.get('maxResults') || '20');
    const analyze = searchParams.get('analyze') === 'true';
    const summarize = searchParams.get('summarize') === 'true';
    
    const gmail = await getGmailClient(userEmail);
    
    // Fetch emails
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResults
    });
    
    const messages = listResponse.data.messages || [];
    const emails = [];
    
    // Fetch details for each email
    for (const message of messages) {
      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: message.id!
      });
      
      const metadata = extractEmailMetadata(msgResponse.data.payload?.headers || []);
      const body = decodeEmailBody(msgResponse.data.payload?.body || msgResponse.data.payload);
      
      // Clean up HTML if present
      const cleanBody = body
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 5000); // Limit length for processing
      
      const email: any = {
        id: message.id,
        threadId: message.threadId,
        ...metadata,
        snippet: msgResponse.data.snippet,
        body: cleanBody,
        labels: msgResponse.data.labelIds || [],
        isUnread: msgResponse.data.labelIds?.includes('UNREAD') || false,
        isImportant: msgResponse.data.labelIds?.includes('IMPORTANT') || false,
        hasAttachments: msgResponse.data.payload?.parts?.some(p => p.filename) || false
      };
      
      // AI Analysis if requested
      if (analyze && cleanBody) {
        try {
          const openai = getOpenAIClient();
          const analysis = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Analyze this email and provide:
                1. Priority: HIGH, MEDIUM, or LOW
                2. Category: CUSTOMER, INTERNAL, MARKETING, PERSONAL, SPAM, or OTHER
                3. Sentiment: POSITIVE, NEUTRAL, NEGATIVE, or URGENT
                4. Action Required: YES or NO
                5. Key Points: 1-2 bullet points of the most important information
                6. Suggested Response: If action required, a brief suggestion
                
                Return as JSON with these exact fields.`
              },
              {
                role: 'user',
                content: `Subject: ${metadata.subject}\nFrom: ${metadata.from}\n\n${cleanBody.substring(0, 2000)}`
              }
            ],
            response_format: { type: 'json_object' }
          });
          
          email.analysis = JSON.parse(analysis.choices[0].message.content || '{}');
        } catch (aiError) {
          console.error('AI analysis error:', aiError);
        }
      }
      
      emails.push(email);
    }
    
    // Generate inbox summary if requested
    let inboxSummary = null;
    if (summarize && emails.length > 0) {
      try {
        const openai = getOpenAIClient();
        const emailSummaries = emails.map(e => 
          `From: ${e.from}\nSubject: ${e.subject}\n${e.analysis ? `Priority: ${e.analysis.priority}` : ''}`
        ).join('\n---\n');
        
        const summary = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an executive assistant. Summarize the inbox status concisely.`
            },
            {
              role: 'user',
              content: `Summarize these ${emails.length} emails:\n\n${emailSummaries}\n\nProvide:
              1. Total email count and unread count
              2. High priority items that need attention
              3. Key topics or themes
              4. Recommended actions`
            }
          ]
        });
        
        inboxSummary = summary.choices[0].message.content;
      } catch (summaryError) {
        console.error('Summary generation error:', summaryError);
      }
    }
    
    return NextResponse.json({
      success: true,
      emailCount: emails.length,
      emails: emails,
      summary: inboxSummary,
      query: query
    });
    
  } catch (error: any) {
    console.error('Email intelligence error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch emails'
    }, { status: 500 });
  }
}

// POST - Draft intelligent email response
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const body = await request.json();
    const { 
      replyTo, // Email ID to reply to
      subject,
      to,
      context, // Context about the email
      tone = 'professional', // professional, friendly, formal, casual
      instructions // Specific instructions for the draft
    } = body;
    
    const gmail = await getGmailClient(userEmail);
    const openai = getOpenAIClient();
    
    // If replying, fetch the original email
    let originalEmail = '';
    let originalMetadata: any = {};
    
    if (replyTo) {
      const msgResponse = await gmail.users.messages.get({
        userId: 'me',
        id: replyTo
      });
      
      originalMetadata = extractEmailMetadata(msgResponse.data.payload?.headers || []);
      const body = decodeEmailBody(msgResponse.data.payload?.body || msgResponse.data.payload);
      originalEmail = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().substring(0, 3000);
    }
    
    // Generate draft with AI
    const draftPrompt = `Generate a professional email ${replyTo ? 'reply' : 'draft'}.

${replyTo ? `Original Email:
From: ${originalMetadata.from}
Subject: ${originalMetadata.subject}
Content: ${originalEmail}
` : ''}

Instructions: ${instructions || 'Write a professional response'}
Tone: ${tone}
${context ? `Context: ${context}` : ''}

Requirements:
- Be concise and clear
- Use appropriate business language
- Include a proper greeting and closing
- Match the specified tone
- If replying, address all points from the original email
- Sign off as ${session?.user?.name || 'Andy Oberlin'}

Return ONLY the email body text, no subject line or metadata.`;

    const draftResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert business email writer. Write emails that are professional, clear, and effective.'
        },
        {
          role: 'user',
          content: draftPrompt
        }
      ]
    });
    
    const draftContent = draftResponse.choices[0].message.content;
    
    // Prepare the email draft
    const emailDraft = {
      to: to || originalMetadata.from || '',
      subject: subject || (replyTo ? `Re: ${originalMetadata.subject}` : 'Draft Email'),
      body: draftContent,
      threadId: replyTo ? originalMetadata.threadId : undefined,
      replyTo: replyTo || undefined
    };
    
    // Optionally create a Gmail draft
    if (body.createDraft) {
      const rawEmail = [
        `To: ${emailDraft.to}`,
        `Subject: ${emailDraft.subject}`,
        `Content-Type: text/plain; charset=UTF-8`,
        '',
        emailDraft.body
      ].join('\n');
      
      const encodedEmail = Buffer.from(rawEmail).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      const draft = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
          message: {
            raw: encodedEmail,
            threadId: emailDraft.threadId
          }
        }
      });
      
      emailDraft.draftId = draft.data.id;
    }
    
    return NextResponse.json({
      success: true,
      draft: emailDraft
    });
    
  } catch (error: any) {
    console.error('Email draft error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create email draft'
    }, { status: 500 });
  }
}

// PATCH - Mark emails as read/unread, archive, etc.
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const body = await request.json();
    const { emailIds, action } = body; // action: markRead, markUnread, archive, star, trash
    
    if (!emailIds || !action) {
      return NextResponse.json({
        success: false,
        error: 'Email IDs and action are required'
      }, { status: 400 });
    }
    
    const gmail = await getGmailClient(userEmail);
    const results = [];
    
    for (const emailId of emailIds) {
      try {
        let modifyRequest: any = {};
        
        switch (action) {
          case 'markRead':
            modifyRequest = { removeLabelIds: ['UNREAD'] };
            break;
          case 'markUnread':
            modifyRequest = { addLabelIds: ['UNREAD'] };
            break;
          case 'archive':
            modifyRequest = { removeLabelIds: ['INBOX'] };
            break;
          case 'star':
            modifyRequest = { addLabelIds: ['STARRED'] };
            break;
          case 'unstar':
            modifyRequest = { removeLabelIds: ['STARRED'] };
            break;
          case 'trash':
            modifyRequest = { addLabelIds: ['TRASH'] };
            break;
          case 'important':
            modifyRequest = { addLabelIds: ['IMPORTANT'] };
            break;
        }
        
        await gmail.users.messages.modify({
          userId: 'me',
          id: emailId,
          requestBody: modifyRequest
        });
        
        results.push({ id: emailId, success: true });
      } catch (error: any) {
        results.push({ id: emailId, success: false, error: error.message });
      }
    }
    
    return NextResponse.json({
      success: true,
      results: results,
      action: action
    });
    
  } catch (error: any) {
    console.error('Email modify error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to modify emails'
    }, { status: 500 });
  }
}