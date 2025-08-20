import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { smsService } from '@/lib/services/sms-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// This endpoint handles incoming SMS messages from Twilio
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;

    console.log('SMS webhook received:', {
      from,
      to,
      body,
      messageSid,
      messageStatus,
      timestamp: new Date().toISOString(),
    });

    // Handle incoming messages
    if (body && from && from !== to) {
      // Check if contact exists
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id')
        .eq('phone', from)
        .single();
      
      const contactId = contacts?.id;

      // Store in communications table for CRM - with all required fields
      const { error: insertError } = await supabase.from('communications').insert({
        contact_id: contactId,
        type: 'sms',
        direction: 'inbound',
        content: body,
        phone_number: from,
        from_address: from,
        to_address: to,
        message_id: messageSid,
        communicated_at: new Date().toISOString(), // Required field
        metadata: { twilio_sid: messageSid },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      if (insertError) {
        console.error('Failed to store SMS in database:', insertError);
      } else {
        console.log('SMS stored successfully from:', from);
      }

      // Update or create conversation
      const { data: existingConv } = await supabase
        .from('sms_conversations')
        .select('id')
        .eq('phone_number', from)
        .single();

      if (existingConv) {
        // Get current unread count and increment it
        const { data: currentConv } = await supabase
          .from('sms_conversations')
          .select('unread_count')
          .eq('id', existingConv.id)
          .single();
        
        const currentUnread = currentConv?.unread_count || 0;
        
        // Update existing conversation with incremented unread count
        await supabase
          .from('sms_conversations')
          .update({
            last_message: body,
            last_message_time: new Date().toISOString(),
            unread_count: currentUnread + 1,
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
            last_message: body,
            last_message_time: new Date().toISOString(),
            unread_count: 1
          });
      }
      
      // Trigger real-time update via SMS service (for client-side updates)
      // Note: This won't work on server-side, but we'll emit a Supabase realtime event
      if (typeof smsService !== 'undefined' && smsService.receiveMessage) {
        // This is server-side, so we can't directly call smsService
        // Instead, we'll rely on Supabase realtime subscriptions or polling
      }
    }

    // Return empty TwiML response
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  } catch (error) {
    console.error('Error in SMS webhook:', error);
    
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 200,
        headers: {
          'Content-Type': 'text/xml',
        },
      }
    );
  }
}

// GET method for webhook validation
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'SMS Webhook is operational',
    info: 'Configure this URL in your Twilio phone number settings',
    url: 'https://your-domain.com/api/twilio/sms-webhook',
  });
}