import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

// Test endpoint for SMS sending (temporary for testing)
export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json();
    
    if (!phone || !message) {
      return NextResponse.json(
        { success: false, message: 'Phone number and message are required' },
        { status: 400 }
      );
    }

    // Initialize Twilio client
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+12602647730';

    if (!accountSid || !authToken) {
      console.error('Twilio credentials missing');
      return NextResponse.json(
        { success: false, message: 'SMS service not configured' },
        { status: 500 }
      );
    }

    const client = twilio(accountSid, authToken);

    // Clean phone number
    let formattedPhone = phone;
    if (!formattedPhone.startsWith('+')) {
      // Remove all non-digits
      const cleaned = formattedPhone.replace(/\D/g, '');
      // Add US country code if 10 digits
      if (cleaned.length === 10) {
        formattedPhone = '+1' + cleaned;
      } else if (cleaned.length === 11 && cleaned[0] === '1') {
        formattedPhone = '+' + cleaned;
      }
    }

    console.log('Sending SMS:', {
      to: formattedPhone,
      from: messagingServiceSid ? 'MessagingService' : fromNumber,
      messageLength: message.length
    });

    // Send the message
    const messageOptions: any = {
      body: message,
      to: formattedPhone,
      from: fromNumber  // Always use the from number directly for now
    };

    // Note: Messaging Service disabled due to invalid SID error
    // Will use direct from number instead

    const result = await client.messages.create(messageOptions);

    console.log('SMS sent successfully:', result.sid);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      sid: result.sid,
      to: result.to,
      status: result.status
    });

  } catch (error) {
    console.error('Error sending test SMS:', error);
    
    // Detailed error logging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
    }

    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send message',
        details: error instanceof Error ? error.toString() : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Test SMS API is operational',
    config: {
      accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Missing',
      authToken: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Missing',
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || 'Not set',
      fromNumber: process.env.TWILIO_PHONE_NUMBER || '+12602647730',
      campaign: {
        brandId: process.env.TWILIO_A2P_BRAND_ID || 'Not set',
        campaignId: process.env.TWILIO_A2P_CAMPAIGN_ID || 'Not set'
      }
    }
  });
}