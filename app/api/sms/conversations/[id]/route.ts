import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/sms/conversations/[id] - Get conversation messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const contactId = id;

    // Get messages for this contact
    const { data: messages, error } = await supabase
      .from('sms_messages')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      messages: messages || []
    });
  } catch (error) {
    console.error('Error in conversations API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/sms/conversations/[id] - Delete conversation by phone number
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // The id parameter can be either a contact ID or phone number
    // We'll try to handle both cases
    const identifier = decodeURIComponent(id);
    
    // Delete all communications (SMS messages) for this identifier
    // Try by phone number first, then by contact ID
    let error;
    
    // First try by phone number
    const { error: phoneError } = await supabase
      .from('communications')
      .delete()
      .eq('phone_number', identifier)
      .eq('type', 'sms');

    if (phoneError) {
      // If that fails, try by contact ID
      const { error: contactError } = await supabase
        .from('sms_messages')
        .delete()
        .eq('contact_id', identifier);
      
      error = contactError;
    } else {
      error = phoneError;
    }

    if (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete conversation',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}