import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

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

// Initialize OpenAI
const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
};

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
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.labels',
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

// Email rule interface
interface EmailRule {
  id?: string;
  user_email: string;
  name: string;
  description: string;
  conditions: {
    from?: string;
    to?: string;
    subject?: string;
    body?: string;
    has_attachment?: boolean;
    sender_domain?: string;
    keywords?: string[];
  };
  actions: {
    add_label?: string;
    remove_label?: string;
    mark_as_read?: boolean;
    mark_as_important?: boolean;
    archive?: boolean;
    forward_to?: string;
    auto_reply?: {
      subject: string;
      body: string;
    };
  };
  active: boolean;
  created_at?: string;
}

// Helper: Create Gmail label (folder)
async function createGmailLabel(gmail: any, labelName: string) {
  try {
    // Check if label already exists
    const labelsResponse = await gmail.users.labels.list({ userId: 'me' });
    const existingLabel = labelsResponse.data.labels?.find(
      (label: any) => label.name === labelName
    );
    
    if (existingLabel) {
      return existingLabel.id;
    }
    
    // Create new label
    const createResponse = await gmail.users.labels.create({
      userId: 'me',
      requestBody: {
        name: labelName,
        messageListVisibility: 'show',
        labelListVisibility: 'labelShow',
        type: 'user'
      }
    });
    
    return createResponse.data.id;
  } catch (error: any) {
    console.error('Error creating label:', error);
    throw error;
  }
}

// Helper: Check if email matches rule conditions
function emailMatchesRule(email: any, rule: EmailRule): boolean {
  const conditions = rule.conditions;
  
  // Check sender
  if (conditions.from && !email.from?.toLowerCase().includes(conditions.from.toLowerCase())) {
    return false;
  }
  
  // Check sender domain
  if (conditions.sender_domain) {
    const domain = email.from?.split('@')[1]?.toLowerCase();
    if (domain !== conditions.sender_domain.toLowerCase()) {
      return false;
    }
  }
  
  // Check recipient
  if (conditions.to && !email.to?.toLowerCase().includes(conditions.to.toLowerCase())) {
    return false;
  }
  
  // Check subject
  if (conditions.subject && !email.subject?.toLowerCase().includes(conditions.subject.toLowerCase())) {
    return false;
  }
  
  // Check body
  if (conditions.body && email.body && !email.body.toLowerCase().includes(conditions.body.toLowerCase())) {
    return false;
  }
  
  // Check keywords
  if (conditions.keywords && conditions.keywords.length > 0) {
    const emailText = `${email.subject} ${email.body}`.toLowerCase();
    const hasKeyword = conditions.keywords.some(keyword => 
      emailText.includes(keyword.toLowerCase())
    );
    if (!hasKeyword) {
      return false;
    }
  }
  
  // Check attachment
  if (conditions.has_attachment !== undefined && 
      Boolean(email.hasAttachments) !== conditions.has_attachment) {
    return false;
  }
  
  return true;
}

// GET - Fetch email rules for user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const supabase = getSupabaseClient();
    
    const { data: rules, error } = await supabase
      .from('email_rules')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      rules: rules || []
    });
    
  } catch (error: any) {
    console.error('Fetch rules error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch rules'
    }, { status: 500 });
  }
}

// POST - Create new email rule
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const body = await request.json();
    const { 
      naturalLanguage, // e.g., "Move all GitHub emails to Development folder"
      rule // Pre-structured rule object
    } = body;
    
    let emailRule: EmailRule;
    
    if (naturalLanguage) {
      // Use AI to parse natural language into rule structure
      const openai = getOpenAIClient();
      
      const rulePrompt = `Parse this natural language email rule into a structured format:

"${naturalLanguage}"

Return a JSON object with this structure:
{
  "name": "Brief rule name",
  "description": "What this rule does",
  "conditions": {
    "from": "sender email/domain (optional)",
    "subject": "subject contains (optional)", 
    "body": "body contains (optional)",
    "sender_domain": "domain only like 'github.com' (optional)",
    "keywords": ["array", "of", "keywords"] (optional),
    "has_attachment": true/false (optional)
  },
  "actions": {
    "add_label": "Label/folder name to add",
    "mark_as_read": true/false (optional),
    "mark_as_important": true/false (optional),
    "archive": true/false (optional)
  }
}

Examples:
- "Move GitHub emails to Development" → add_label: "Development", sender_domain: "github.com"
- "Mark marketing emails as read" → mark_as_read: true, keywords: ["marketing", "unsubscribe", "promotion"]
- "Put invoices in Accounting folder" → add_label: "Accounting", keywords: ["invoice", "billing", "payment"]`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at parsing email rules. Return valid JSON only.'
          },
          {
            role: 'user',
            content: rulePrompt
          }
        ],
        response_format: { type: 'json_object' }
      });
      
      const parsedRule = JSON.parse(completion.choices[0].message.content || '{}');
      
      emailRule = {
        user_email: userEmail,
        name: parsedRule.name || 'Untitled Rule',
        description: parsedRule.description || 'Auto-generated rule',
        conditions: parsedRule.conditions || {},
        actions: parsedRule.actions || {},
        active: true
      };
    } else if (rule) {
      emailRule = {
        user_email: userEmail,
        active: true,
        ...rule
      };
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either naturalLanguage or rule parameter is required'
      }, { status: 400 });
    }
    
    // Create Gmail label if specified in actions
    if (emailRule.actions.add_label) {
      const gmail = await getGmailClient(userEmail);
      await createGmailLabel(gmail, emailRule.actions.add_label);
    }
    
    // Save rule to database
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('email_rules')
      .insert(emailRule)
      .select()
      .single();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      rule: data,
      message: `Email rule "${emailRule.name}" created successfully`
    });
    
  } catch (error: any) {
    console.error('Create rule error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create rule'
    }, { status: 500 });
  }
}

// PUT - Apply rules to existing emails
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const body = await request.json();
    const { ruleId, applyToExisting = true } = body;
    
    const supabase = getSupabaseClient();
    const gmail = await getGmailClient(userEmail);
    
    // Get the rule
    const { data: rule, error: ruleError } = await supabase
      .from('email_rules')
      .select('*')
      .eq('id', ruleId)
      .eq('user_email', userEmail)
      .single();
    
    if (ruleError) throw ruleError;
    if (!rule) throw new Error('Rule not found');
    
    let processedCount = 0;
    
    if (applyToExisting) {
      // Fetch recent emails to apply rule to
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/aimpact/email/intelligence?maxResults=50`);
      const emailData = await emailResponse.json();
      
      if (emailData.success && emailData.emails) {
        for (const email of emailData.emails) {
          if (emailMatchesRule(email, rule)) {
            try {
              // Apply rule actions
              const modifyRequest: any = {};
              
              if (rule.actions.add_label) {
                const labelId = await createGmailLabel(gmail, rule.actions.add_label);
                modifyRequest.addLabelIds = [labelId];
              }
              
              if (rule.actions.mark_as_read) {
                modifyRequest.removeLabelIds = modifyRequest.removeLabelIds || [];
                modifyRequest.removeLabelIds.push('UNREAD');
              }
              
              if (rule.actions.mark_as_important) {
                modifyRequest.addLabelIds = modifyRequest.addLabelIds || [];
                modifyRequest.addLabelIds.push('IMPORTANT');
              }
              
              if (rule.actions.archive) {
                modifyRequest.removeLabelIds = modifyRequest.removeLabelIds || [];
                modifyRequest.removeLabelIds.push('INBOX');
              }
              
              if (Object.keys(modifyRequest).length > 0) {
                await gmail.users.messages.modify({
                  userId: 'me',
                  id: email.id,
                  requestBody: modifyRequest
                });
                processedCount++;
              }
            } catch (actionError) {
              console.error(`Error applying rule to email ${email.id}:`, actionError);
            }
          }
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      rule: rule,
      processedEmails: processedCount,
      message: `Rule applied to ${processedCount} existing emails`
    });
    
  } catch (error: any) {
    console.error('Apply rule error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to apply rule'
    }, { status: 500 });
  }
}

// DELETE - Delete email rule
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('ruleId');
    
    if (!ruleId) {
      return NextResponse.json({
        success: false,
        error: 'Rule ID is required'
      }, { status: 400 });
    }
    
    const supabase = getSupabaseClient();
    
    const { error } = await supabase
      .from('email_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_email', userEmail);
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: 'Email rule deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Delete rule error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete rule'
    }, { status: 500 });
  }
}