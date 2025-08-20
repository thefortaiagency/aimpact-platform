import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get all SMS communications grouped by phone number
    const { data: communications, error } = await supabase
      .from('communications')
      .select(`
        phone_number,
        content,
        created_at,
        direction,
        contact_id,
        read_at
      `)
      .eq('type', 'sms')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching communications:', error);
      throw error;
    }

    // Group by phone number to create conversations
    const conversationsMap = new Map();
    
    for (const msg of communications || []) {
      if (!msg.phone_number) continue;
      
      if (!conversationsMap.has(msg.phone_number)) {
        // Get contact info if available
        let contactName = null;
        if (msg.contact_id) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('first_name, last_name')
            .eq('id', msg.contact_id)
            .single();
          
          if (contact) {
            contactName = `${contact.first_name} ${contact.last_name || ''}`.trim();
          }
        }
        
        conversationsMap.set(msg.phone_number, {
          phone_number: msg.phone_number,
          contact_id: msg.contact_id,
          contact_name: contactName,
          last_message: msg.content,
          last_message_time: msg.created_at,
          unread_count: 0,
          messages: []
        });
      }
      
      const conversation = conversationsMap.get(msg.phone_number);
      
      // Count unread inbound messages
      if (msg.direction === 'inbound' && !msg.read_at) {
        conversation.unread_count++;
      }
      
      // Add message to conversation
      conversation.messages.push({
        content: msg.content,
        direction: msg.direction,
        created_at: msg.created_at,
        read_at: msg.read_at
      });
    }
    
    // Convert map to array and sort by last message time
    const conversations = Array.from(conversationsMap.values())
      .sort((a, b) => {
        const timeA = new Date(a.last_message_time).getTime();
        const timeB = new Date(b.last_message_time).getTime();
        return timeB - timeA;
      });

    return NextResponse.json({
      success: true,
      conversations,
      total: conversations.length
    });

  } catch (error) {
    console.error('Error in conversations API:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to load conversations',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST method to mark messages as read
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();
    
    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Mark all inbound messages from this number as read
    const { error } = await supabase
      .from('communications')
      .update({ read_at: new Date().toISOString() })
      .eq('phone_number', phoneNumber)
      .eq('type', 'sms')
      .eq('direction', 'inbound')
      .is('read_at', null);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to mark messages as read',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}