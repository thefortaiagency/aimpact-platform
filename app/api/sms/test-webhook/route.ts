import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Test endpoint to simulate incoming SMS
export async function POST(request: NextRequest) {
  try {
    const { from, message } = await request.json();
    
    if (!from || !message) {
      return NextResponse.json(
        { success: false, message: 'From and message are required' },
        { status: 400 }
      );
    }

    const messageSid = `test_${Date.now()}`;
    const to = process.env.TWILIO_PHONE_NUMBER || '+12602647730';

    console.log('Simulating incoming SMS:', {
      from,
      to,
      message,
      messageSid
    });

    // Check if contact exists
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', from)
      .single();
    
    const contactId = contacts?.id;

    // Store in communications table
    const { data: communication, error: commError } = await supabase
      .from('communications')
      .insert({
        contact_id: contactId,
        type: 'sms',
        direction: 'inbound',
        content: message,
        phone_number: from,
        from_address: from,
        to_address: to,
        message_id: messageSid,
        metadata: { 
          twilio_sid: messageSid,
          test: true 
        }
      })
      .select()
      .single();

    if (commError) {
      console.error('Error storing message:', commError);
      throw commError;
    }

    // Check if conversation exists
    const { data: existingConv } = await supabase
      .from('sms_conversations')
      .select('id')
      .eq('phone_number', from)
      .single();

    if (existingConv) {
      // Update existing conversation
      await supabase
        .from('sms_conversations')
        .update({
          last_message: message,
          last_message_time: new Date().toISOString(),
          unread_count: 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingConv.id);
    } else {
      // Create new conversation
      await supabase
        .from('sms_conversations')
        .insert({
          phone_number: from,
          contact_id: contactId,
          last_message: message,
          last_message_time: new Date().toISOString(),
          unread_count: 1
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Test SMS simulated successfully',
      communication_id: communication.id,
      messageSid
    });

  } catch (error) {
    console.error('Error simulating SMS:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to simulate SMS',
        details: error instanceof Error ? error.toString() : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method for testing
export async function GET() {
  // Get recent test messages
  const { data: messages } = await supabase
    .from('communications')
    .select('*')
    .eq('type', 'sms')
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    status: 'ready',
    message: 'Test webhook endpoint is operational',
    usage: 'POST with { from: "+1234567890", message: "Test message" }',
    recent_messages: messages?.map(m => ({
      from: m.phone_number,
      content: m.content,
      created_at: m.created_at
    }))
  });
}