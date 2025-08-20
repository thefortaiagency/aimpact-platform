import { NextRequest, NextResponse } from 'next/server';
import { verifyCode } from '@/lib/twilio-service';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  try {
    const { phone, code, type } = await request.json();
    
    if (!phone || !code) {
      return NextResponse.json(
        { success: false, message: 'Phone number and code are required' },
        { status: 400 }
      );
    }
    
    // Verify the code
    const result = await verifyCode(phone, code, type);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }
    
    // Get current session (if exists)
    const session = await auth();
    
    // If verification successful and user is logged in, 
    // you might want to update their profile to mark phone as verified
    if (session?.user?.id) {
      // TODO: Update user profile in database
      // await updateUserPhoneVerified(session.user.id, phone);
      console.log(`Phone verified for user ${session.user.id}: ${phone}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Phone number verified successfully',
      phone: phone,
    });
  } catch (error) {
    console.error('Error in verify-code API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to verify code' 
      },
      { status: 500 }
    );
  }
}

// GET method for testing
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Code Verification API is operational',
    info: 'Send POST request with { phone, code, type? }',
  });
}