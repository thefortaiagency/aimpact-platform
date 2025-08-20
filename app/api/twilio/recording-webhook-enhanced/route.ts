import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { clientMatcher } from '@/lib/services/client-matcher';
import { db } from '@/lib/db/drizzle';
import { communications } from '@/lib/db/schema-communications';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract all Twilio parameters
    const recordingSid = formData.get('RecordingSid') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingStatus = formData.get('RecordingStatus') as string;
    const recordingDuration = formData.get('RecordingDuration') as string;
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const direction = formData.get('Direction') as string;
    
    console.log('📞 Enhanced Recording Webhook - Processing:', {
      recordingSid,
      callSid,
      from,
      to,
      direction,
      status: recordingStatus
    });

    // Only process completed recordings
    if (recordingStatus !== 'completed') {
      return NextResponse.json({ 
        message: `Recording status: ${recordingStatus}` 
      });
    }

    // Match the phone numbers to clients
    const callerPhone = direction === 'inbound' ? from : to;
    const matchResult = await clientMatcher.matchCommunication({
      phone: callerPhone
    });

    console.log('🔍 Client match result:', matchResult);

    // Store the recording with client information
    const { data: recording, error: recordingError } = await supabase
      .from('call_recordings')
      .insert({
        call_sid: callSid,
        recording_sid: recordingSid,
        recording_url: recordingUrl,
        from_number: from,
        to_number: to,
        duration: parseInt(recordingDuration),
        direction: direction || 'unknown',
        status: recordingStatus,
        organization_id: matchResult.organizationId,
        contact_id: matchResult.contactId,
        is_new_contact: matchResult.isNewContact,
        match_type: matchResult.matchType,
        match_confidence: matchResult.confidence
      })
      .select()
      .single();

    if (recordingError) {
      console.error('Error storing recording:', recordingError);
      return NextResponse.json({ 
        error: 'Failed to store recording',
        details: recordingError.message 
      }, { status: 500 });
    }

    console.log('✅ Recording stored with client match:', recording);

    // Create a communication record for the CRM
    if (matchResult.contactId) {
      try {
        await db.insert(communications).values({
          contactId: matchResult.contactId,
          organizationId: matchResult.organizationId!,
          type: 'phone',
          direction: direction === 'inbound' ? 'inbound' : 'outbound',
          status: 'completed',
          subject: `Phone call - ${direction === 'inbound' ? 'Incoming' : 'Outgoing'}`,
          content: `Duration: ${recordingDuration} seconds`,
          metadata: {
            callSid,
            recordingSid,
            recordingUrl,
            from,
            to,
            duration: recordingDuration
          },
          timestamp: new Date()
        });

        console.log('✅ Communication record created for contact:', matchResult.contactId);
      } catch (commError) {
        console.error('Error creating communication record:', commError);
        // Don't fail the webhook if communication record fails
      }
    }

    // Request transcription if not already requested
    if (!recording.transcription_requested) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      
      const transcriptionUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}/Transcriptions.json`;
      
      try {
        const transcriptionResponse = await fetch(transcriptionUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            TranscriptionCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/transcription-webhook-enhanced`
          })
        });

        if (transcriptionResponse.ok) {
          // Update the recording to mark transcription as requested
          await supabase
            .from('call_recordings')
            .update({ transcription_requested: true })
            .eq('id', recording.id);
          
          console.log('📝 Transcription requested for recording:', recordingSid);
        }
      } catch (transcriptionError) {
        console.error('Error requesting transcription:', transcriptionError);
      }
    }

    return NextResponse.json({ 
      message: 'Recording processed successfully',
      recordingId: recording.id,
      clientMatched: !!matchResult.contactId,
      matchType: matchResult.matchType
    });

  } catch (error) {
    console.error('Error in enhanced recording webhook:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Enhanced Recording Webhook with Client Matching',
    features: [
      'Automatic client matching by phone number',
      'Creates communication records in CRM',
      'Stores organization and contact IDs',
      'Tracks match confidence',
      'Handles new contact creation'
    ]
  });
}