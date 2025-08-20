import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingClientMessage } from '@/lib/twilio-client-messaging';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

// Twilio webhook to handle incoming SMS
export async function POST(request: NextRequest) {
  try {
    // Parse the webhook data (Twilio sends form-encoded data)
    const formData = await request.formData();
    const From = formData.get('From') as string;
    const Body = formData.get('Body') as string;
    const MessageSid = formData.get('MessageSid') as string;
    const To = formData.get('To') as string;

    if (!From || !Body || !MessageSid) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    console.log('Incoming SMS received:', {
      from: From,
      to: To,
      body: Body,
      sid: MessageSid,
      timestamp: new Date().toISOString(),
    });

    // Check if it's a STOP message first
    const stopKeywords = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
    const isStopMessage = stopKeywords.some(keyword => 
      Body.toUpperCase().trim().includes(keyword)
    );
    
    if (isStopMessage) {
      // Clean and format phone number
      const cleanPhone = From.replace('+1', '').replace(/\D/g, '');
      const formattedPhone = `${cleanPhone.slice(0, 3)}-${cleanPhone.slice(3, 6)}-${cleanPhone.slice(6)}`;
      
      // Opt them out using the database function
      const supabase = getSupabaseClient();
      const { error } = await supabase.rpc('handle_sms_opt_out', {
        p_phone: formattedPhone,
        p_method: 'sms_stop'
      });
      
      if (error) {
        console.error('Failed to opt out user:', error);
      } else {
        console.log(`Successfully opted out: ${formattedPhone}`);
      }
      
      // Return opt-out confirmation
      const confirmationTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>You have been successfully removed from AImpact Nexus SMS messages. You will not receive any more texts from this number. For support, contact support@aimpactnexus.ai</Message>
</Response>`;

      return new NextResponse(confirmationTwiml, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Process the incoming message normally
    const result = await handleIncomingClientMessage(From, Body, MessageSid);

    // If this should create a ticket, do it
    if (result.shouldCreateTicket) {
      const supabase = getSupabaseClient();
      
      // Try to find the contact by phone number
      const { data: contact } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, organization_id')
        .eq('phone', From)
        .single();

      // Generate ticket number
      const { data: lastTicket } = await supabase
        .from('tickets')
        .select('ticket_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      let ticketNumber = 'TKT-000001';
      if (lastTicket?.ticket_number) {
        const lastNum = parseInt(lastTicket.ticket_number.split('-')[1]);
        ticketNumber = `TKT-${String(lastNum + 1).padStart(6, '0')}`;
      }

      // Create the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          ticket_number: ticketNumber,
          subject: result.ticketSubject || `SMS from ${From}`,
          description: result.ticketDescription || Body,
          status: 'open',
          priority: Body.toUpperCase().includes('URGENT') ? 'high' : 'medium',
          category: 'support',
          contact_id: contact?.id,
          organization_id: contact?.organization_id,
          metadata: {
            source: 'sms',
            phone: From,
            messageSid: MessageSid,
          }
        })
        .select()
        .single();

      if (!ticketError && ticket) {
        console.log('Ticket created from SMS:', {
          ticketNumber,
          contactId: contact?.id,
          phone: From,
        });

        // Update the response to include ticket number
        result.response = `Fort AI: Support ticket ${ticketNumber} created. We'll respond within 1 business hour. For urgent issues, call (260) 999-0142.`;
      }
    }

    // Store the conversation in database
    const supabase = getSupabaseClient();
    await supabase
      .from('sms_conversations')
      .insert({
        phone_number: From,
        direction: 'inbound',
        message: Body,
        message_sid: MessageSid,
        response: result.response,
        metadata: {
          to: To,
          shouldCreateTicket: result.shouldCreateTicket,
        }
      });

    // Return TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${result.response}</Message>
</Response>`;

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('Error in SMS webhook:', error);
    
    // Return a generic error response to Twilio
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Fort AI: We received your message but encountered an error. Please call (260) 999-0142 for assistance.</Message>
</Response>`;

    return new NextResponse(errorTwiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  }
}

// GET method for webhook validation (Twilio may check this)
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'SMS Webhook is operational',
    info: 'Configure this URL in your Twilio Messaging Service webhook settings',
    url: 'https://your-domain.com/api/sms/webhook',
  });
}