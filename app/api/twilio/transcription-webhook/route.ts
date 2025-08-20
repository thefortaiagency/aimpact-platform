import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize OpenAI for sentiment analysis
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

// This webhook is called when transcription is ready
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract transcription details from Twilio
    const transcriptionSid = formData.get('TranscriptionSid') as string;
    const transcriptionText = formData.get('TranscriptionText') as string;
    const transcriptionStatus = formData.get('TranscriptionStatus') as string;
    const recordingSid = formData.get('RecordingSid') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('Transcription webhook received:', {
      transcriptionSid,
      recordingSid,
      callSid,
      status: transcriptionStatus,
      textLength: transcriptionText?.length
    });

    if (transcriptionStatus === 'completed' && transcriptionText) {
      // Perform sentiment analysis using OpenAI
      const sentimentAnalysis = await analyzeSentiment(transcriptionText);
      
      // Store transcription in database
      const { data, error } = await supabase
        .from('call_transcriptions')
        .insert({
          transcription_sid: transcriptionSid,
          recording_sid: recordingSid,
          call_sid: callSid,
          transcription_text: transcriptionText,
          sentiment: sentimentAnalysis.sentiment,
          sentiment_score: sentimentAnalysis.score,
          key_topics: sentimentAnalysis.topics,
          action_items: sentimentAnalysis.actionItems,
          status: transcriptionStatus,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing transcription:', error);
      } else {
        console.log('Transcription stored with sentiment analysis');
        
        // Send notification if negative sentiment detected
        if (sentimentAnalysis.sentiment === 'negative' && sentimentAnalysis.score < -0.5) {
          await sendAlertNotification(callSid, transcriptionText, sentimentAnalysis);
        }
        
        // Create action items if detected
        if (sentimentAnalysis.actionItems.length > 0) {
          await createActionItems(callSid, sentimentAnalysis.actionItems);
        }
      }
    }

    return new NextResponse('Transcription received', { status: 200 });
    
  } catch (error) {
    console.error('Error in transcription webhook:', error);
    return new NextResponse('Error processing transcription', { status: 500 });
  }
}

// Analyze sentiment and extract insights using AI
async function analyzeSentiment(text: string) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a call analysis expert. Analyze the following call transcription and provide:
            1. Overall sentiment (positive, neutral, negative)
            2. Sentiment score (-1 to 1)
            3. Key topics discussed (max 5)
            4. Action items that need follow-up (if any)
            5. Customer satisfaction indicators
            
            Return as JSON with format:
            {
              "sentiment": "positive|neutral|negative",
              "score": number,
              "topics": string[],
              "actionItems": string[],
              "customerSatisfaction": "high|medium|low",
              "summary": "brief summary of the call"
            }`
        },
        {
          role: 'user',
          content: text
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 500
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      sentiment: analysis.sentiment || 'neutral',
      score: analysis.score || 0,
      topics: analysis.topics || [],
      actionItems: analysis.actionItems || [],
      customerSatisfaction: analysis.customerSatisfaction || 'medium',
      summary: analysis.summary || ''
    };
    
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {
      sentiment: 'neutral',
      score: 0,
      topics: [],
      actionItems: [],
      customerSatisfaction: 'medium',
      summary: ''
    };
  }
}

// Send alert notification for negative sentiment
async function sendAlertNotification(callSid: string, text: string, analysis: any) {
  try {
    // You can implement email, SMS, or in-app notifications here
    console.log('⚠️ Negative sentiment detected in call:', callSid);
    console.log('Sentiment score:', analysis.score);
    console.log('Summary:', analysis.summary);
    
    // Store alert in database
    await supabase
      .from('call_alerts')
      .insert({
        call_sid: callSid,
        alert_type: 'negative_sentiment',
        severity: analysis.score < -0.7 ? 'high' : 'medium',
        message: `Negative sentiment detected: ${analysis.summary}`,
        created_at: new Date().toISOString()
      });
      
  } catch (error) {
    console.error('Error sending alert:', error);
  }
}

// Create action items from call
async function createActionItems(callSid: string, actionItems: string[]) {
  try {
    const items = actionItems.map(item => ({
      call_sid: callSid,
      description: item,
      status: 'pending',
      created_at: new Date().toISOString()
    }));
    
    const { error } = await supabase
      .from('call_action_items')
      .insert(items);
      
    if (error) {
      console.error('Error creating action items:', error);
    } else {
      console.log(`Created ${actionItems.length} action items from call`);
    }
    
  } catch (error) {
    console.error('Error creating action items:', error);
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Transcription webhook is operational',
    features: [
      'Stores call transcriptions',
      'Performs sentiment analysis',
      'Detects action items',
      'Sends alerts for negative sentiment',
      'Tracks customer satisfaction'
    ]
  });
}