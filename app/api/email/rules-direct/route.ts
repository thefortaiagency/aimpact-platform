import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { Client } from 'pg';
import OpenAI from 'openai';

// Direct PostgreSQL connection to bypass Supabase schema cache
const getDirectDbClient = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false } // Always use SSL for Supabase
  });
  await client.connect();
  return client;
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

// POST - Create new email rule using direct PostgreSQL
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
    if (emailRule.actions.add_label) {
      const gmail = await getGmailClient(userEmail);
      await createGmailLabel(gmail, emailRule.actions.add_label);
    }
    
    // Save rule to database using direct PostgreSQL
    const client = await getDirectDbClient();
    
    try {
      // First ensure the table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS email_rules (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_email TEXT NOT NULL,
          name TEXT NOT NULL,
          description TEXT,
          conditions JSONB NOT NULL DEFAULT '{}',
          actions JSONB NOT NULL DEFAULT '{}',
          active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `);
      
      // Insert the rule
      const result = await client.query(`
        INSERT INTO email_rules (user_email, name, description, conditions, actions, active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `, [
        emailRule.user_email,
        emailRule.name,
        emailRule.description,
        JSON.stringify(emailRule.conditions),
        JSON.stringify(emailRule.actions),
        emailRule.active
      ]);
      
      const savedRule = result.rows[0];
      
      return NextResponse.json({
        success: true,
        rule: {
          ...savedRule,
          conditions: JSON.parse(savedRule.conditions),
          actions: JSON.parse(savedRule.actions)
        },
        message: `Email rule "${emailRule.name}" created successfully using direct database connection!`
      });
      
    } finally {
      await client.end();
    }
    
  } catch (error: any) {
    console.error('Create rule error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create rule'
    }, { status: 500 });
  }
}

// GET - Fetch email rules using direct PostgreSQL
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email || process.env.DEFAULT_CALENDAR_EMAIL || 'aoberlin@thefortaiagency.ai';
    
    const client = await getDirectDbClient();
    
    try {
      const result = await client.query(`
        SELECT * FROM email_rules 
        WHERE user_email = $1 
        ORDER BY created_at DESC;
      `, [userEmail]);
      
      const rules = result.rows.map(rule => ({
        ...rule,
        conditions: JSON.parse(rule.conditions),
        actions: JSON.parse(rule.actions)
      }));
      
      return NextResponse.json({
        success: true,
        rules: rules,
        message: `Found ${rules.length} email rules using direct database connection`
      });
      
    } finally {
      await client.end();
    }
    
  } catch (error: any) {
    console.error('Fetch rules error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch rules'
    }, { status: 500 });
  }
}