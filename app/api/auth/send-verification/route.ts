import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationCode } from '@/lib/twilio-service';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (optional - depends on your flow)
    const session = await auth();
    
    const { phone, type = 'verification' } = await request.json();
    
    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    // Validate type
    if (!['verification', 'login', 'passwordReset'].includes(type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification type' },
        { status: 400 }
      );
    }
    
    // Send verification code
    const result = await sendVerificationCode(
      phone,
      type as 'verification' | 'login' | 'passwordReset'
    );
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
    // Log the verification attempt (optional)
    console.log(`Verification code sent to ${phone} for ${type}`, {
      sid: result.sid,
      userId: session?.user?.id,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      sid: result.sid,
    });
  } catch (error) {
    console.error('Error in send-verification API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to send verification code' 
      },
      { status: 500 }
    );
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'SMS Verification API is operational',
    endpoints: {
      send: 'POST /api/auth/send-verification',
      verify: 'POST /api/auth/verify-code',
    },
  });
}