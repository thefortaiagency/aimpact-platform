import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// WhatsApp sandbox number (update with your business number in production)
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

export async function POST(request: NextRequest) {
  try {
    // Check for required credentials
    if (!accountSid || !authToken) {
      return NextResponse.json({
        success: false,
        error: 'Twilio credentials not configured'
      }, { status: 500 });
    }

    const client = twilio(accountSid, authToken);
    const { to, message, mediaUrl } = await request.json();
    
    // Validate input
    if (!to || !message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: to, message'
      }, { status: 400 });
    }
    
    // Format the WhatsApp number
    const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    
    // Prepare message options
    const messageOptions: any = {
      body: message,
      from: WHATSAPP_FROM,
      to: toWhatsApp
    };
    
    // Add media if provided (images, documents, etc.)
    if (mediaUrl) {
      messageOptions.mediaUrl = Array.isArray(mediaUrl) ? mediaUrl : [mediaUrl];
    }
    
    // Send the WhatsApp message
    const result = await client.messages.create(messageOptions);
    
    console.log('WhatsApp message sent:', {
      sid: result.sid,
      to: toWhatsApp,
      status: result.status,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      messageSid: result.sid,
      status: result.status,
      to: result.to,
      from: result.from
    });
    
  } catch (error: any) {
    console.error('WhatsApp send error:', error);
    
    // Handle specific Twilio errors
    if (error.code === 63003) {
      return NextResponse.json({
        success: false,
        error: 'Recipient has not joined the WhatsApp sandbox. They need to send the join message first.',
        code: error.code
      }, { status: 400 });
    } else if (error.code === 21408) {
      return NextResponse.json({
        success: false,
        error: 'WhatsApp permission denied. Check Twilio account configuration.',
        code: error.code
      }, { status: 403 });
    }
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
      code: error.code
    }, { status: 500 });
  }
}

// GET endpoint to check WhatsApp configuration
export async function GET() {
  return NextResponse.json({
    configured: !!accountSid && !!authToken,
    sandboxNumber: '+1 415 523 8886',
    fromNumber: WHATSAPP_FROM,
    instructions: {
      sandbox: 'Have users text "join <your-keyword>" to +1 415 523 8886',
      production: 'For production, set up WhatsApp Business in Twilio Console'
    }
  });
}