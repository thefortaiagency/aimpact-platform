import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { db } from '@/lib/db/drizzle';
import { communications } from '@/lib/db/schema-communications';
import { eq, and } from 'drizzle-orm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract Twilio parameters
    const transcriptionSid = formData.get('TranscriptionSid') as string;
    const transcriptionText = formData.get('TranscriptionText') as string;
    const transcriptionStatus = formData.get('TranscriptionStatus') as string;
    const recordingSid = formData.get('RecordingSid') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('📝 Enhanced Transcription Webhook - Processing:', {
      transcriptionSid,
      callSid,
      recordingSid,
      status: transcriptionStatus,
      textLength: transcriptionText?.length
    });

    if (transcriptionStatus !== 'completed' || !transcriptionText) {
      return NextResponse.json({ 
        message: `Transcription status: ${transcriptionStatus}` 
      });
    }

    // Get the recording to find client information
    const { data: recording } = await supabase
      .from('call_recordings')
      .select('*')
      .eq('recording_sid', recordingSid)
      .single();

    if (!recording) {
      console.error('Recording not found for transcription:', recordingSid);
      return NextResponse.json({ 
        error: 'Recording not found' 
      }, { status: 404 });
    }

    // Perform sentiment analysis and extract insights
    let sentimentData = {
      sentiment: 'neutral' as 'positive' | 'neutral' | 'negative',
      sentiment_score: 0,
      key_topics: [] as string[],
      action_items: [] as string[],
      customer_satisfaction: 'unknown',
      summary: '',
      has_complaint: false,
      has_question: false,
      urgency_level: 'normal' as 'low' | 'normal' | 'high'
    };

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a customer service analyst. Analyze this call transcription and provide:
              1. Overall sentiment (positive, neutral, or negative)
              2. Sentiment score (-100 to 100)
              3. Key topics discussed (max 5)
              4. Action items for follow-up (if any)
              5. Customer satisfaction level (very satisfied, satisfied, neutral, dissatisfied, very dissatisfied)
              6. Brief summary (2-3 sentences)
              7. Whether there's a complaint (true/false)
              8. Whether there are unanswered questions (true/false)
              9. Urgency level (low, normal, high)
              
              Return as JSON with these exact field names: sentiment, sentiment_score, key_topics, action_items, customer_satisfaction, summary, has_complaint, has_question, urgency_level`
          },
          {
            role: 'user',
            content: transcriptionText
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      sentimentData = { ...sentimentData, ...analysis };
      
      console.log('🧠 Sentiment analysis complete:', sentimentData);
    } catch (aiError) {
      console.error('Error with sentiment analysis:', aiError);
    }

    // Store the transcription with client and sentiment information
    const { data: transcription, error: transcriptionError } = await supabase
      .from('call_transcriptions')
      .insert({
        call_sid: callSid,
        recording_sid: recordingSid,
        transcription_sid: transcriptionSid,
        transcription_text: transcriptionText,
        organization_id: recording.organization_id,
        contact_id: recording.contact_id,
        ...sentimentData,
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (transcriptionError) {
      console.error('Error storing transcription:', transcriptionError);
      return NextResponse.json({ 
        error: 'Failed to store transcription' 
      }, { status: 500 });
    }

    // Update the communication record with transcription and sentiment
    if (recording.contact_id) {
      try {
        // Find the communication record for this call
        const existingComm = await db
          .select()
          .from(communications)
          .where(
            and(
              eq(communications.contactId, recording.contact_id),
              eq(communications.metadata, { callSid })
            )
          )
          .limit(1);

        if (existingComm.length > 0) {
          // Update existing communication
          await db
            .update(communications)
            .set({
              content: transcriptionText,
              summary: sentimentData.summary,
              sentiment: sentimentData.sentiment,
              metadata: {
                ...existingComm[0].metadata,
                transcriptionSid,
                sentiment: sentimentData.sentiment,
                sentimentScore: sentimentData.sentiment_score,
                keyTopics: sentimentData.key_topics,
                actionItems: sentimentData.action_items,
                hasComplaint: sentimentData.has_complaint,
                urgencyLevel: sentimentData.urgency_level
              },
              updatedAt: new Date()
            })
            .where(eq(communications.id, existingComm[0].id));
        } else {
          // Create new communication if not found
          await db.insert(communications).values({
            contactId: recording.contact_id,
            organizationId: recording.organization_id!,
            type: 'phone',
            direction: recording.direction === 'inbound' ? 'inbound' : 'outbound',
            status: 'completed',
            subject: `Phone call - ${sentimentData.sentiment} sentiment`,
            content: transcriptionText,
            summary: sentimentData.summary,
            sentiment: sentimentData.sentiment,
            metadata: {
              callSid,
              recordingSid,
              transcriptionSid,
              sentiment: sentimentData.sentiment,
              sentimentScore: sentimentData.sentiment_score,
              keyTopics: sentimentData.key_topics,
              actionItems: sentimentData.action_items,
              hasComplaint: sentimentData.has_complaint,
              urgencyLevel: sentimentData.urgency_level
            },
            timestamp: new Date()
          });
        }

        console.log('✅ Communication record updated with transcription');
      } catch (commError) {
        console.error('Error updating communication:', commError);
      }
    }

    // Create alerts for negative sentiment or complaints
    if (sentimentData.sentiment === 'negative' || sentimentData.has_complaint) {
      await supabase
        .from('call_alerts')
        .insert({
          call_sid: callSid,
          organization_id: recording.organization_id,
          contact_id: recording.contact_id,
          alert_type: sentimentData.has_complaint ? 'complaint' : 'negative_sentiment',
          severity: sentimentData.urgency_level === 'high' ? 'high' : 
                   sentimentData.urgency_level === 'low' ? 'low' : 'medium',
          message: sentimentData.has_complaint ? 
            `Customer complaint detected: ${sentimentData.summary}` :
            `Negative sentiment detected (score: ${sentimentData.sentiment_score}): ${sentimentData.summary}`,
          is_resolved: false
        });

      console.log('🚨 Alert created for negative sentiment/complaint');
    }

    // Create action items if any
    if (sentimentData.action_items.length > 0) {
      const actionItemsToInsert = sentimentData.action_items.map(item => ({
        call_sid: callSid,
        organization_id: recording.organization_id,
        contact_id: recording.contact_id,
        action_item: item,
        is_completed: false,
        priority: sentimentData.urgency_level === 'high' ? 'high' :
                 sentimentData.urgency_level === 'low' ? 'low' : 'medium'
      }));

      await supabase
        .from('call_action_items')
        .insert(actionItemsToInsert);

      console.log(`📋 Created ${actionItemsToInsert.length} action items`);
    }

    // Update recording with transcription status
    await supabase
      .from('call_recordings')
      .update({ 
        has_transcription: true,
        transcription_id: transcription.id
      })
      .eq('id', recording.id);

    return NextResponse.json({ 
      message: 'Transcription processed successfully',
      transcriptionId: transcription.id,
      sentiment: sentimentData.sentiment,
      alertCreated: sentimentData.sentiment === 'negative' || sentimentData.has_complaint,
      actionItemsCount: sentimentData.action_items.length,
      clientId: recording.contact_id
    });

  } catch (error) {
    console.error('Error in enhanced transcription webhook:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Enhanced Transcription Webhook with Client Integration',
    features: [
      'Links transcriptions to matched clients',
      'Updates communication records in CRM',
      'Performs sentiment analysis on all calls',
      'Creates alerts for negative sentiment',
      'Extracts and stores action items',
      'Detects complaints and urgent issues',
      'Updates client satisfaction scores'
    ]
  });
}