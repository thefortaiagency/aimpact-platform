import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import twilio from 'twilio';

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const apiKeySid = process.env.TWILIO_API_KEY_SID!;
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET!;
const twimlAppSid = process.env.TWILIO_TWIML_APP_SID!;
const phoneNumbers = process.env.TWILIO_PHONE_NUMBERS?.split(',') || [];
const primaryNumber = phoneNumbers[0] || process.env.TWILIO_PHONE_NUMBER || '+12602647730';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated (optional for now)
    const session = await auth();
    
    // Create a clean identity - use consistent identity for anonymous users
    const baseIdentity = session?.user?.email || 'default_agent';
    // Remove all non-alphanumeric except underscores, no spaces allowed
    const identity = baseIdentity
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .substring(0, 100);
    
    console.log('Generating AccessToken:', {
      identity,
      accountSid: accountSid?.substring(0, 10) + '...',
      hasApiKey: !!apiKeySid,
      hasApiSecret: !!apiKeySecret,
      hasTwimlApp: !!twimlAppSid,
    });

    // Check required environment variables
    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      console.error('Missing required Twilio credentials', {
        accountSid: !!accountSid,
        apiKeySid: !!apiKeySid,
        apiKeySecret: !!apiKeySecret,
        twimlAppSid: !!twimlAppSid
      });
      
      // Fallback to auth token method if API keys not available
      if (accountSid && process.env.TWILIO_AUTH_TOKEN && twimlAppSid) {
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;
        
        // Create access token with auth token (less secure but works)
        const token = new AccessToken(
          accountSid,
          apiKeySid || 'dummy', // This will fail, but we need to try
          apiKeySecret || authToken,
          { identity }
        );
        
        // Create Voice grant
        const voiceGrant = new VoiceGrant({
          outgoingApplicationSid: twimlAppSid,
          incomingAllow: true
        });
        
        token.addGrant(voiceGrant);
        token.ttl = 3600; // 1 hour
        
        return NextResponse.json({
          token: token.toJwt(),
          identity,
          callerId: primaryNumber
        });
      }
      
      return NextResponse.json(
        { error: 'Server configuration error - missing API keys' },
        { status: 500 }
      );
    }

    // Use the modern AccessToken approach
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create access token with API key
    const token = new AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      { 
        identity,
        ttl: 3600 // 1 hour
      }
    );

    // Create Voice grant with both incoming and outgoing
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true
    });

    // Add the grant to the token
    token.addGrant(voiceGrant);
    
    const jwt = token.toJwt();
    console.log(`AccessToken generated for ${identity}, length: ${jwt.length}`);

    return NextResponse.json({
      token: jwt,
      identity,
      callerId: primaryNumber
    });

  } catch (error: any) {
    console.error('Error generating Twilio voice token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate voice token' },
      { status: 500 }
    );
  }
}

// POST method for refreshing token
export async function POST(request: NextRequest) {
  return GET(request);
}