import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// This webhook handles incoming WhatsApp messages
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Extract WhatsApp message data
    const from = formData.get('From') as string; // whatsapp:+1234567890
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const profileName = formData.get('ProfileName') as string; // WhatsApp profile name
    const mediaUrl0 = formData.get('MediaUrl0') as string; // First media attachment if any
    const numMedia = formData.get('NumMedia') as string;
    
    console.log('WhatsApp message received:', {
      from,
      profileName,
      body,
      messageSid,
      hasMedia: numMedia !== '0',
      timestamp: new Date().toISOString()
    });
    
    // Create TwiML response
    const twiml = new twilio.twiml.MessagingResponse();
    
    // Process the message based on content
    const messageBody = body?.trim().toUpperCase() || '';
    
    // Handle opt-out
    if (messageBody === 'STOP' || messageBody === 'UNSUBSCRIBE') {
      twiml.message('Fort AI: You have been unsubscribed from WhatsApp notifications. Thank you!');
      
      // TODO: Update database to mark user as opted out
      
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      });
    }
    
    // Handle help request
    if (messageBody === 'HELP' || messageBody === 'INFO') {
      twiml.message(`Fort AI Support on WhatsApp:
      
📞 Call: (260) 264-7730
📧 Email: support@thefortaiagency.ai
💬 Or reply with your question

Available commands:
• HELP - Show this message
• STATUS - Check system status
• STOP - Unsubscribe`);
      
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      });
    }
    
    // Handle status check
    if (messageBody === 'STATUS') {
      twiml.message('Fort AI Systems: ✅ All systems operational');
      
      return new NextResponse(twiml.toString(), {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      });
    }
    
    // Default response for general messages
    twiml.message(`Fort AI: Message received! A team member will respond during business hours. For urgent issues, call (260) 264-7730.`);
    
    // TODO: Create support ticket or route to appropriate handler
    // You could integrate this with your ticketing system:
    // await createTicket({
    //   source: 'whatsapp',
    //   from: from.replace('whatsapp:', ''),
    //   profileName,
    //   message: body,
    //   mediaUrls: numMedia > 0 ? [mediaUrl0] : []
    // });
    
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
    
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    
    // Return empty response to prevent Twilio errors
    const twiml = new twilio.twiml.MessagingResponse();
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

// GET endpoint for webhook validation
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'WhatsApp webhook endpoint',
    instructions: 'Configure this URL in your Twilio WhatsApp sandbox settings'
  });
}