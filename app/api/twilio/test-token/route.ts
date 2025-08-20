import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET(request: NextRequest) {
  // Log all environment variables (redacted)
  const config = {
    accountSid: process.env.TWILIO_ACCOUNT_SID?.substring(0, 10) + '...',
    hasApiKeySid: !!process.env.TWILIO_API_KEY_SID,
    apiKeySid: process.env.TWILIO_API_KEY_SID?.substring(0, 10) + '...',
    hasApiKeySecret: !!process.env.TWILIO_API_KEY_SECRET,
    hasTwimlAppSid: !!process.env.TWILIO_TWIML_APP_SID,
    twimlAppSid: process.env.TWILIO_TWIML_APP_SID?.substring(0, 10) + '...',
  };

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const apiKeySid = process.env.TWILIO_API_KEY_SID!;
    const apiKeySecret = process.env.TWILIO_API_KEY_SECRET!;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID!;

    if (!accountSid || !apiKeySid || !apiKeySecret || !twimlAppSid) {
      return NextResponse.json({
        error: 'Missing required environment variables',
        config,
        missing: {
          accountSid: !accountSid,
          apiKeySid: !apiKeySid,
          apiKeySecret: !apiKeySecret,
          twimlAppSid: !twimlAppSid,
        }
      }, { status: 500 });
    }

    // Try to generate a test token
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const identity = 'test_' + Date.now();
    const token = new AccessToken(
      accountSid,
      apiKeySid,
      apiKeySecret,
      { 
        identity,
        ttl: 3600
      }
    );

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true
    });

    token.addGrant(voiceGrant);
    const jwt = token.toJwt();

    // Decode the JWT to check its structure
    const parts = jwt.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    return NextResponse.json({
      success: true,
      config,
      identity,
      tokenLength: jwt.length,
      tokenPreview: jwt.substring(0, 50) + '...',
      payload: {
        grants: payload.grants,
        iat: payload.iat,
        exp: payload.exp,
        iss: payload.iss,
        sub: payload.sub,
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      config,
      stack: error.stack,
    }, { status: 500 });
  }
}