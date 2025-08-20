import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Initialize clients conditionally to avoid build errors
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

const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export async function POST(request: NextRequest) {
  try {
    const openai = getOpenAIClient();
    const body = await request.json();
    
    // Simple test of OpenAI
    const testResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: 'Categorize this email: ' + (body.subject || 'test')
        }
      ],
      max_tokens: 50
    });
    
    return NextResponse.json({
      success: true,
      openAIResponse: testResponse.choices[0].message.content,
      apiKeySet: !!process.env.OPENAI_API_KEY,
      apiKeyLength: process.env.OPENAI_API_KEY?.length || 0
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      apiKeySet: !!process.env.OPENAI_API_KEY,
      apiKeyLength: process.env.OPENAI_API_KEY?.length || 0
    });
  }
}