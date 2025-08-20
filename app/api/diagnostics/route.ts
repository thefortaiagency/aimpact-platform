import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  // Check environment variables
  const rawKey = process.env.OPENAI_API_KEY;
  const cleanKey = rawKey?.replace(/\\n/g, '').replace(/^["']|["']$/g, '').trim();
  
  const diagnostics = {
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    apiKeys: {
      openai: {
        isSet: !!rawKey,
        rawLength: rawKey?.length || 0,
        cleanLength: cleanKey?.length || 0,
        prefix: cleanKey?.substring(0, 7) || 'not-set',
        hasNewlines: rawKey?.includes('\\n'),
        endsWithNewline: rawKey?.endsWith('\\n')
      },
      supabase: {
        urlSet: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKeySet: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      },
      resend: {
        isSet: !!process.env.RESEND_API_KEY,
        length: process.env.RESEND_API_KEY?.length || 0
      }
    },
    testOpenAI: {
      status: 'not-tested',
      error: null,
      model: null
    }
  };

  // Test OpenAI connection
  if (cleanKey) {
    try {
      const openai = new OpenAI({
        apiKey: cleanKey
      });

      // Try a simple completion
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: 'Say "test successful" in JSON format'
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 50
      });

      diagnostics.testOpenAI = {
        status: 'success',
        error: null,
        model: 'gpt-4o-mini',
        response: JSON.parse(completion.choices[0].message.content || '{}')
      };
    } catch (error: any) {
      diagnostics.testOpenAI = {
        status: 'failed',
        error: error.message || 'Unknown error',
        errorCode: error.code || 'unknown',
        errorType: error.type || 'unknown',
        errorStatus: error.status || 'unknown',
        fullError: JSON.stringify(error.cause || error.response?.data || {}),
        model: 'gpt-4o-mini'
      };
    }
  }

  return NextResponse.json(diagnostics);
}