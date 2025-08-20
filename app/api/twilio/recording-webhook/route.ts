import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This webhook is called when a recording is ready
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract recording details from Twilio
    const recordingSid = formData.get('RecordingSid') as string;
    const recordingUrl = formData.get('RecordingUrl') as string;
    const recordingDuration = formData.get('RecordingDuration') as string;
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const recordingStatus = formData.get('RecordingStatus') as string;
    
    console.log('Recording webhook received:', {
      recordingSid,
      callSid,
      from,
      to,
      duration: recordingDuration,
      status: recordingStatus
    });

    // Store recording info in database
    const { data, error } = await supabase
      .from('call_recordings')
      .insert({
        recording_sid: recordingSid,
        call_sid: callSid,
        recording_url: recordingUrl,
        duration: parseInt(recordingDuration || '0'),
        from_number: from,
        to_number: to,
        status: recordingStatus,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error storing recording:', error);
    }

    // Request transcription from Twilio
    if (recordingStatus === 'completed') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      
      // Create transcription request
      const transcriptionResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recordingSid}/Transcriptions.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            'TranscriptionType': 'fast',
            'CallbackUrl': 'https://aimpactnexus.ai/api/twilio/transcription-webhook'
          })
        }
      );

      if (!transcriptionResponse.ok) {
        console.error('Failed to request transcription:', await transcriptionResponse.text());
      } else {
        console.log('Transcription requested for recording:', recordingSid);
      }
    }

    // Return success response to Twilio
    return new NextResponse('Recording received', { status: 200 });
    
  } catch (error) {
    console.error('Error in recording webhook:', error);
    return new NextResponse('Error processing recording', { status: 500 });
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Recording webhook is operational',
    info: 'This endpoint processes call recordings from Twilio'
  });
}