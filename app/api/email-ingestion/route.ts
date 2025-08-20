import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Initialize clients conditionally to avoid build errors
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

const getOpenAIClient = () => {
  // Clean the API key to remove any trailing newlines or quotes
  const cleanApiKey = process.env.OPENAI_API_KEY?.replace(/\\n/g, '').replace(/^["']|["']$/g, '').trim();
  if (!cleanApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: cleanApiKey
  });
};

// Email parsing interface
interface IncomingEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  messageId?: string;
  date?: string;
  attachments?: any[];
}

// AI Analysis result
interface AIAnalysis {
  category: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  urgency: 'low' | 'medium' | 'high';
  suggestedActions: string[];
  detectedClient?: string;
  detectedProject?: string;
  confidence: number;
  suggestedSolution?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Initialize clients
    const supabase = getSupabaseClient();
    const openai = getOpenAIClient();
    
    // Parse the incoming email webhook
    let emailData: IncomingEmail;
    let body: any;
    
    try {
      // Clone the request to avoid "body already read" error
      const clonedRequest = request.clone();
      body = await clonedRequest.json();
      
      // Handle different webhook formats (Zapier, Make, direct)
      if (body.from && body.subject) {
        // Direct format
        emailData = body;
      } else if (body.data) {
        // Zapier format with nested data
        emailData = body.data;
      } else if (body.payload) {
        // Alternative webhook format
        emailData = body.payload;
      } else {
        // Try to extract email data from any format
        emailData = {
          from: body.from || body.sender || body.email || 'unknown@example.com',
          to: body.to || body.recipient || 'support@thefortaiagency.ai',
          subject: body.subject || body.title || 'No subject',
          text: body.text || body.body || body.message || body.content || '',
          html: body.html || body.html_body || '',
          messageId: body.messageId || body.message_id || body.id || `webhook-${Date.now()}`,
          date: body.date || body.timestamp || new Date().toISOString()
        };
      }
    } catch (parseError) {
      console.error('Error parsing webhook body:', parseError);
      // Create minimal email data
      emailData = {
        from: 'webhook@unknown.com',
        to: 'support@thefortaiagency.ai',
        subject: 'Webhook parsing error',
        text: 'Unable to parse webhook data',
        messageId: `error-${Date.now()}`,
        date: new Date().toISOString()
      };
    };
    
    console.log('📧 Processing incoming email:', {
      from: emailData.from,
      subject: emailData.subject,
      messageId: emailData.messageId
    });

    // Check if email was already processed
    if (emailData.messageId) {
      const { data: existing } = await supabase
        .from('email_ingestion')
        .select('id')
        .eq('message_id', emailData.messageId)
        .single();
      
      if (existing) {
        return NextResponse.json({ 
          success: true, 
          message: 'Email already processed',
          emailId: existing.id 
        });
      }
    }

    // Step 1: Analyze email with AI
    const aiAnalysis = await analyzeEmailWithAI(emailData, openai);
    
    // Step 2: Find or create contact and organization
    const { contact, organization } = await findOrCreateContact(emailData.from, aiAnalysis, supabase);
    
    // Step 3: Search knowledge base for similar issues
    const matchedSolutions = await searchKnowledgeBase(emailData.text || emailData.html || '', aiAnalysis, supabase);
    
    // Step 4: Create ticket if needed
    let ticketId = null;
    let autoResponded = false;
    let responseContent = null;
    
    if (aiAnalysis.urgency !== 'low' || aiAnalysis.sentiment === 'negative') {
      ticketId = await createTicket({
        email: emailData,
        analysis: aiAnalysis,
        contactId: contact?.id,
        organizationId: organization?.id,
        matchedSolutions,
        supabase
      });
      
      // Step 5: Auto-respond if high confidence solution found
      if (aiAnalysis.confidence > 0.9 && (matchedSolutions.length > 0 || aiAnalysis.suggestedSolution)) {
        responseContent = await generateAutoResponse(
          emailData, 
          aiAnalysis, 
          matchedSolutions[0] || { solution: aiAnalysis.suggestedSolution },
          openai
        );
        
        // Send auto-response (integrate with your email service)
        if (responseContent) {
          await sendAutoResponse(emailData.from, emailData.subject, responseContent);
          autoResponded = true;
        }
      }
    }
    
    // Step 6: Log email ingestion
    const { data: ingestionLog, error: logError } = await supabase
      .from('email_ingestion')
      .insert({
        message_id: emailData.messageId || `${Date.now()}-${emailData.from}`,
        from_email: emailData.from,
        to_email: emailData.to,
        subject: emailData.subject,
        body: emailData.text || emailData.html,
        processed: true,
        processed_at: new Date().toISOString(),
        ai_analysis: aiAnalysis,
        ticket_created: !!ticketId,
        ticket_id: ticketId,
        auto_responded: autoResponded,
        response_content: responseContent,
        matched_solutions: matchedSolutions
      })
      .select()
      .single();
    
    if (logError) {
      console.error('Error logging email ingestion:', logError);
    }
    
    // Step 7: Create AI prediction if pattern detected
    if (aiAnalysis.detectedProject) {
      await createPrediction({
        entityType: 'project',
        entityId: aiAnalysis.detectedProject,
        predictionType: 'issue',
        prediction: {
          category: aiAnalysis.category,
          sentiment: aiAnalysis.sentiment,
          urgency: aiAnalysis.urgency
        },
        confidence: aiAnalysis.confidence,
        suggestedAction: aiAnalysis.suggestedActions[0],
        supabase
      });
    }
    
    return NextResponse.json({
      success: true,
      emailId: ingestionLog?.id,
      ticketId,
      autoResponded,
      analysis: aiAnalysis
    });
    
  } catch (error) {
    console.error('Error processing email:', error);
    return NextResponse.json(
      { error: 'Failed to process email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Analyze email content with OpenAI
async function analyzeEmailWithAI(email: IncomingEmail, openai: OpenAI): Promise<AIAnalysis> {
  try {

    const prompt = `
      Analyze this customer support email and provide structured insights:
      
      From: ${email.from}
      Subject: ${email.subject}
      Body: ${email.text || email.html || ''}
      
      Provide analysis in JSON format with:
      1. category: (technical, billing, feature-request, complaint, inquiry, other)
      2. sentiment: (positive, neutral, negative)
      3. urgency: (low, medium, high)
      4. suggestedActions: array of recommended actions
      5. detectedClient: extracted company/client name if mentioned
      6. detectedProject: extracted project name if mentioned
      7. confidence: 0-1 score of analysis confidence
      8. suggestedSolution: if this is a common issue, suggest a solution
    `;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini which supports JSON mode
      messages: [
        {
          role: 'system',
          content: 'You are an expert customer support analyst. Analyze emails and provide structured JSON responses. You must respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    const analysis = JSON.parse(completion.choices[0].message.content || '{}');
    
    return {
      category: analysis.category || 'other',
      sentiment: analysis.sentiment || 'neutral',
      urgency: analysis.urgency || 'medium',
      suggestedActions: analysis.suggestedActions || [],
      detectedClient: analysis.detectedClient,
      detectedProject: analysis.detectedProject,
      confidence: analysis.confidence || 0.5,
      suggestedSolution: analysis.suggestedSolution
    };
  } catch (error) {
    console.error('AI analysis failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      apiKey: process.env.OPENAI_API_KEY ? 'Set (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'Not set',
      model: 'gpt-4o-mini'
    });
    return {
      category: 'other',
      sentiment: 'neutral',
      urgency: 'medium',
      suggestedActions: ['Manual review required'],
      confidence: 0
    };
  }
}

// Find or create contact based on email
async function findOrCreateContact(email: string, analysis: AIAnalysis, supabase: any) {
  // Extract name from email if possible
  const emailParts = email.split('@');
  const namePart = emailParts[0].replace(/[._-]/g, ' ');
  const domain = emailParts[1];
  
  // Try to find existing contact
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('*, organization:organizations(*)')
    .eq('email', email)
    .single();
  
  if (existingContact) {
    return {
      contact: existingContact,
      organization: existingContact.organization
    };
  }
  
  // Try to find organization by domain
  const { data: organization } = await supabase
    .from('organizations')
    .select('*')
    .eq('domain', domain)
    .single();
  
  // Create new contact
  const names = namePart.split(' ');
  const { data: newContact } = await supabase
    .from('contacts')
    .insert({
      email,
      first_name: names[0] || 'Unknown',
      last_name: names.slice(1).join(' ') || 'Contact',
      organization_id: organization?.id
    })
    .select()
    .single();
  
  return {
    contact: newContact,
    organization
  };
}

// Search knowledge base for similar issues
async function searchKnowledgeBase(content: string, analysis: AIAnalysis, supabase: any) {
  // Search by category first
  const { data: knowledgeEntries } = await supabase
    .from('knowledge_base')
    .select('*')
    .eq('problem_category', analysis.category)
    .gte('ai_confidence', 0.7)
    .order('success_rate', { ascending: false })
    .limit(3);
  
  if (!knowledgeEntries || knowledgeEntries.length === 0) {
    return [];
  }
  
  // Format matched solutions
  return knowledgeEntries.map(entry => ({
    knowledgeBaseId: entry.id,
    confidence: entry.ai_confidence,
    solution: entry.solution
  }));
}

// Create support ticket
async function createTicket(params: {
  email: IncomingEmail;
  analysis: AIAnalysis;
  contactId?: string;
  organizationId?: string;
  matchedSolutions: any[];
  supabase: any;
}) {
  const { email, analysis, contactId, organizationId, matchedSolutions, supabase } = params;
  
  // Generate ticket number
  const { data: lastTicket } = await supabase
    .from('tickets')
    .select('ticket_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  let ticketNumber = 'TKT-000001';
  if (lastTicket?.ticket_number) {
    const lastNum = parseInt(lastTicket.ticket_number.split('-')[1]);
    ticketNumber = `TKT-${String(lastNum + 1).padStart(6, '0')}`;
  }
  
  // Create ticket
  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      ticket_number: ticketNumber,
      subject: email.subject,
      description: email.text || email.html || '',
      status: 'open',
      priority: analysis.urgency === 'high' ? 'high' : analysis.urgency === 'low' ? 'low' : 'medium',
      category: analysis.category,
      contact_id: contactId,
      organization_id: organizationId,
      ai_insights: {
        sentiment: analysis.sentiment,
        suggestedActions: analysis.suggestedActions,
        category: analysis.category,
        matchedSolutions: matchedSolutions.map(s => s.solution)
      }
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating ticket:', error);
    return null;
  }
  
  // Update knowledge base usage count
  for (const solution of matchedSolutions) {
    await supabase
      .from('knowledge_base')
      .update({
        usage_count: supabase.raw('usage_count + 1'),
        last_used_at: new Date().toISOString()
      })
      .eq('id', solution.knowledgeBaseId);
  }
  
  return ticket?.id;
}

// Generate auto-response
async function generateAutoResponse(
  email: IncomingEmail, 
  analysis: AIAnalysis, 
  solution: any,
  openai: OpenAI
): Promise<string> {
  try {

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful customer support agent. Generate a professional, friendly response to customer emails.'
        },
        {
          role: 'user',
          content: `
            Generate a response to this email:
            Subject: ${email.subject}
            Content: ${email.text || email.html}
            
            Suggested solution: ${solution.solution}
            
            Make the response professional, helpful, and include the solution. Sign off as "Fort AI Support Team".
          `
        }
      ]
    });
    
    return completion.choices[0].message.content || '';
  } catch (error) {
    console.error('Failed to generate auto-response:', error);
    return '';
  }
}

// Send auto-response email via Resend
async function sendAutoResponse(to: string, subject: string, content: string) {
  try {
    console.log('📤 Sending auto-response via Resend...');
    
    const requestBody = {
      from: process.env.RESEND_FROM_EMAIL || 'Fort AI Support <contact@thefortaiagency.com>',
      to: to,
      subject: `Re: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${content}
          <hr style="margin: 30px 0; border: 1px solid #eee;">
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #666; font-size: 12px; margin: 0;">
              This is an automated response from Fort AI Support. 
              A support ticket has been created for your request.
            </p>
            <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
              If you need immediate assistance, please call us at (555) 123-4567
            </p>
          </div>
        </div>
      `,
      reply_to: 'support@thefortaiagency.ai' // All replies go to support
    };
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Auto-response sent successfully:', result.id);
      return true;
    } else {
      const error = await response.text();
      console.error('❌ Failed to send auto-response:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending auto-response:', error);
    return false;
  }
}

// Create AI prediction
async function createPrediction(params: {
  entityType: string;
  entityId: string;
  predictionType: string;
  prediction: any;
  confidence: number;
  suggestedAction?: string;
  supabase: any;
}) {
  const { supabase } = params;
  await supabase
    .from('ai_predictions')
    .insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      prediction_type: params.predictionType,
      prediction: params.prediction,
      confidence: params.confidence,
      suggested_action: params.suggestedAction,
      suggested_priority: params.prediction.urgency || 'medium',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    });
}

// GET method for webhook testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ready',
    message: 'Email ingestion webhook is ready to receive emails',
    endpoint: '/api/aimpact/email-ingestion',
    methods: ['POST'],
    formats: {
      direct: {
        from: 'sender@example.com',
        to: 'support@thefortaiagency.ai',
        subject: 'Email subject',
        text: 'Email body text',
        html: '<p>Email body HTML</p>'
      },
      zapier: {
        data: {
          from: 'sender@example.com',
          to: 'support@thefortaiagency.ai',
          subject: 'Email subject',
          body_plain: 'Email body text',
          body_html: '<p>Email body HTML</p>'
        }
      }
    }
  });
}