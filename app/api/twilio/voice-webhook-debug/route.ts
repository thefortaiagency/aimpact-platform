import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// This debug endpoint logs everything and makes a simple outbound call
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const allParams: any = {};
    
    // Log ALL parameters
    formData.forEach((value, key) => {
      allParams[key] = value;
    });
    
    console.log('=== VOICE WEBHOOK DEBUG ===');
    console.log('All parameters received:', JSON.stringify(allParams, null, 2));
    console.log('===========================');
    
    // Extract key parameters
    const direction = formData.get('Direction') as string;
    const to = formData.get('To') as string;
    const from = formData.get('From') as string;
    const callSid = formData.get('CallSid') as string;
    
    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Handle incoming calls ONLY
    if (direction === 'inbound' && !to.startsWith('+') && !to.startsWith('1')) {
      console.log('INCOMING CALL - Routing to clients');
      
      // Welcome message for incoming calls only
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Welcome to Fort AI Agency. Connecting you to the next available agent.');
      
      // Route to available clients with enhanced recording callback
      const dial = twiml.dial({
        callerId: from,
        answerOnBridge: true,
        timeout: 20,
        record: 'record-from-answer',
        recordingStatusCallback: 'https://aimpactnexus.ai/api/twilio/recording-webhook-enhanced',
        recordingStatusCallbackMethod: 'POST',
        recordingStatusCallbackEvent: ['completed', 'failed']
      });
      
      // Route to consistent identities
      dial.client('default_agent'); // Anonymous users
      dial.client('aoberlin_thefortaiagency_com'); // Your email  
      dial.client('admin'); // Admin fallback
      
      // Voicemail fallback with enhanced recording and transcription callbacks
      twiml.say('All agents are currently busy. Please leave a message after the beep.');
      twiml.record({
        maxLength: 120,
        transcribe: true,
        transcribeCallback: 'https://aimpactnexus.ai/api/twilio/transcription-webhook-enhanced',
        recordingStatusCallback: 'https://aimpactnexus.ai/api/twilio/recording-webhook-enhanced',
        recordingStatusCallbackMethod: 'POST'
      });
      
    } else if (direction === 'outbound-api' || (to && to !== '' && !to.startsWith('client:'))) {
      // Handle outbound calls
      console.log(`Outbound call - Direction: ${direction}, To: ${to}`);
      
      // Clean the number
      let numberToDial = to;
      if (!numberToDial.startsWith('+')) {
        // Assume US number
        const cleaned = numberToDial.replace(/\D/g, '');
        numberToDial = '+1' + cleaned;
      }
      
      const dial = twiml.dial({
        callerId: '+12602647730'  // Your main number
      });
      dial.number(numberToDial);
      
    } else {
      console.log('No valid number to dial, hanging up');
      twiml.say('Unable to complete the call. Please check the number and try again.');
      twiml.hangup();
    }
    
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error in voice webhook debug:', error);
    
    const errorTwiml = new twilio.twiml.VoiceResponse();
    errorTwiml.say('An error occurred. Please try again.');
    errorTwiml.hangup();
    
    return new NextResponse(errorTwiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Voice Webhook Debug endpoint',
  });
}