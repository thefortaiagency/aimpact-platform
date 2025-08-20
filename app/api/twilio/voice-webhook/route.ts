import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// This endpoint handles TwiML for voice calls
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callStatus = formData.get('CallStatus') as string;
    const direction = formData.get('Direction') as string;
    
    // For outbound calls - parameters come from the SDK
    const toParam = formData.get('To') as string; // This is what the SDK sends
    const callerIdParam = formData.get('CallerId') as string;
    const callerName = formData.get('CallerName') as string;

    console.log('Voice webhook received:', {
      callSid,
      from,
      to,
      callStatus,
      direction,
      timestamp: new Date().toISOString(),
    });

    // Create TwiML response
    const twiml = new twilio.twiml.VoiceResponse();

    if (direction === 'inbound') {
      // Handle incoming calls
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Welcome to Fort AI Agency. Connecting you to the next available agent.');
      
      // Route to available clients with consistent identity
      const dial = twiml.dial({
        callerId: from,
        answerOnBridge: true,
        timeout: 20,
        record: 'record-from-answer'
      });
      
      // Route to the consistent identities from voice-token
      dial.client('default_agent'); // Anonymous users
      dial.client('aoberlin_thefortaiagency_com'); // Your email  
      dial.client('admin'); // Admin fallback
      
      // If no agents answer, leave a voicemail
      twiml.say('All agents are currently busy. Please leave a message after the beep.');
      twiml.record({
        maxLength: 120,
        transcribe: true,
        transcribeCallback: '/api/twilio/transcription-webhook',
      });
      
    } else if (direction === 'outbound-dial') {
      // Handle outbound calls from the softphone
      console.log('Outbound call webhook - all params:', {
        to,
        toParam,
        from,
        callerIdParam,
        direction,
        callStatus
      });
      
      // The number to dial comes from the 'To' parameter passed by the SDK
      if (toParam) {
        // Format the number properly
        let numberToDial = toParam;
        
        // Ensure it starts with + for international format
        if (!numberToDial.startsWith('+') && !numberToDial.startsWith('client:')) {
          // Assume US number if no country code
          numberToDial = '+1' + numberToDial.replace(/\D/g, '');
        }
        
        console.log('Dialing number:', numberToDial);
        
        // Use the CallerId parameter or default to your approved number
        const outgoingCallerId = callerIdParam || '+12602647730';
        
        // For outbound calls, just dial the number directly
        const dial = twiml.dial({
          callerId: outgoingCallerId,
        });
        
        // Check if calling another agent (starts with 'client:')
        if (numberToDial.startsWith('client:')) {
          dial.client(numberToDial.replace('client:', ''));
        } else {
          // Regular phone number
          dial.number(numberToDial);
        }
      } else {
        console.error('No number to dial provided');
        twiml.say('Unable to complete the call. Please check the number and try again.');
        twiml.hangup();
      }
    }

    // Return TwiML response
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error in voice webhook:', error);
    
    // Return error TwiML
    const errorTwiml = new twilio.twiml.VoiceResponse();
    errorTwiml.say('An error occurred. Please try again later.');
    errorTwiml.hangup();
    
    return new NextResponse(errorTwiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

// GET method for webhook validation
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Voice Webhook is operational',
    info: 'Configure this URL in your Twilio TwiML App settings',
    url: 'https://your-domain.com/api/twilio/voice-webhook',
  });
}