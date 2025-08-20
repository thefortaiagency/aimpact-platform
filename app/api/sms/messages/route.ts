import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phoneNumber = searchParams.get('phone');
    
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Get all messages for this phone number
    const { data: messages, error } = await supabase
      .from('communications')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('type', 'sms')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
      total: messages?.length || 0
    });

  } catch (error) {
    console.error('Error in messages API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to load messages',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}