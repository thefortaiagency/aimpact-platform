import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { auth } from '@/auth';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

// Hybrid storage: Try database first, fallback to file
const FALLBACK_RULES_FILE = path.join(process.cwd(), 'data', 'email-rules-production.json');

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

// Hybrid storage operations
const ensureDataDir = () => {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const loadRulesFromFile = (): any[] => {
  try {
    if (fs.existsSync(FALLBACK_RULES_FILE)) {
      const data = fs.readFileSync(FALLBACK_RULES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading rules from file:', error);
  }
  return [];
};

const saveRulesToFile = (rules: any[]) => {
  try {
    ensureDataDir();
    fs.writeFileSync(FALLBACK_RULES_FILE, JSON.stringify(rules, null, 2));
  } catch (error) {
    console.error('Error saving rules to file:', error);
    throw error;
  }
};

const saveRule = async (rule: any) => {
  const supabase = getSupabaseClient();
  
  try {
    // Try database first
    const { data, error } = await supabase
      .from('email_rules')
      .insert(rule)
      .select()
      .single();
    
    if (error) throw error;
    
    console.log('Rule saved to database successfully');
    return { ...data, storage: 'database' };
  } catch (dbError: any) {
    console.log('Database save failed, using file fallback:', dbError.message);
    
    // Fallback to file storage
    const rules = loadRulesFromFile();
    const ruleWithId = {
      ...rule,
      id: Date.now().toString(),
      created_at: new Date().toISOString()
    };
    rules.push(ruleWithId);
    saveRulesToFile(rules);
    
    return { ...ruleWithId, storage: 'file' };
  }
};

const getRules = async (userEmail: string) => {
  const supabase = getSupabaseClient();
  
  try {
    // Try database first
    const { data: rules, error } = await supabase
      .from('email_rules')
      .select('*')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log('Rules loaded from database successfully');
    return { rules: rules || [], storage: 'database' };
  } catch (dbError: any) {
    console.log('Database load failed, using file fallback:', dbError.message);
    
    // Fallback to file storage
    const fileRules = loadRulesFromFile().filter(rule => rule.user_email === userEmail);
    return { rules: fileRules, storage: 'file' };
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

// POST - Create new email rule (PRODUCTION)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const body = await request.json();
    const { naturalLanguage } = body;
    
    if (!naturalLanguage) {
      return NextResponse.json({
        success: false,
        error: 'naturalLanguage parameter is required'
      }, { status: 400 });
    }

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
    
    const emailRule = {
      user_email: userEmail,
      name: parsedRule.name || 'Untitled Rule',
      description: parsedRule.description || 'Auto-generated rule',
      conditions: parsedRule.conditions || {},
      actions: parsedRule.actions || {},
      active: true
    };
    
    // Create Gmail label if specified in actions
    let labelCreated = false;
    if (emailRule.actions.add_label) {
      try {
        const gmail = await getGmailClient(userEmail);
        await createGmailLabel(gmail, emailRule.actions.add_label);
        labelCreated = true;
      } catch (labelError) {
        console.error('Gmail label creation failed:', labelError);
        // Continue anyway - the rule parsing worked
      }
    }
    
    // Save rule using hybrid storage
    const savedRule = await saveRule(emailRule);
    
    return NextResponse.json({
      success: true,
      rule: savedRule,
      message: `✅ Email rule "${emailRule.name}" created successfully!${labelCreated ? ` Gmail folder "${emailRule.actions.add_label}" created.` : ''}`,
      storage: savedRule.storage,
      production: true
    });
    
  } catch (error: any) {
    console.error('Create rule error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create rule'
    }, { status: 500 });
  }
}

// GET - Fetch email rules (PRODUCTION)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const { rules, storage } = await getRules(userEmail);
    
    return NextResponse.json({
      success: true,
      rules: rules,
      count: rules.length,
      message: `Found ${rules.length} email rules`,
      storage: storage,
      production: true
    });
    
  } catch (error: any) {
    console.error('Fetch rules error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch rules'
    }, { status: 500 });
  }
}

// DELETE - Delete rule (PRODUCTION)
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
    
    try {
      // Try database first
      const { error } = await supabase
        .from('email_rules')
        .delete()
        .eq('id', ruleId)
        .eq('user_email', userEmail);
      
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        message: 'Email rule deleted successfully',
        storage: 'database',
        production: true
      });
    } catch (dbError: any) {
      console.log('Database delete failed, using file fallback:', dbError.message);
      
      // Fallback to file storage
      const rules = loadRulesFromFile();
      const filteredRules = rules.filter(rule => 
        !(rule.id === ruleId && rule.user_email === userEmail)
      );
      
      if (rules.length === filteredRules.length) {
        return NextResponse.json({
          success: false,
          error: 'Rule not found'
        }, { status: 404 });
      }
      
      saveRulesToFile(filteredRules);
      
      return NextResponse.json({
        success: true,
        message: 'Email rule deleted successfully',
        storage: 'file',
        production: true
      });
    }
    
  } catch (error: any) {
    console.error('Delete rule error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete rule'
    }, { status: 500 });
  }
}