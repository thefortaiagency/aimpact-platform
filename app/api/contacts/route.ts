import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      contacts
    });

  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch contacts',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Contact ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Update the contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        first_name: body.first_name,
        last_name: body.last_name || '',
        email: body.email,
        phone: body.phone || null,
        position: body.position || null,
        organization_id: body.organization_id || null,
        notes: body.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      contact,
      message: 'Contact updated successfully'
    });

  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Contact ID is required' },
        { status: 400 }
      );
    }

    // Delete the contact
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to delete contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.first_name || !body.phone) {
      return NextResponse.json(
        { success: false, message: 'First name and phone are required' },
        { status: 400 }
      );
    }

    // Format phone number
    const cleanPhone = body.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `+1${cleanPhone}` : 
                           cleanPhone.length === 11 && cleanPhone[0] === '1' ? `+${cleanPhone}` :
                           body.phone;

    // Check if contact already exists
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone', formattedPhone)
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Contact with this phone number already exists' },
        { status: 409 }
      );
    }

    // Create the contact - email is required in database
    const { data: contact, error } = await supabase
      .from('contacts')
      .insert({
        first_name: body.first_name,
        last_name: body.last_name || '',
        phone: formattedPhone,
        email: body.email || `${formattedPhone.replace(/\D/g, '')}@sms.local`, // Generate placeholder email if not provided
        organization_id: body.organization_id || null,
        is_active: body.is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contact:', error);
      throw error;
    }

    // Update any existing communications with this phone number
    await supabase
      .from('communications')
      .update({ contact_id: contact.id })
      .eq('phone_number', formattedPhone)
      .is('contact_id', null);

    return NextResponse.json({
      success: true,
      contact,
      message: 'Contact created successfully'
    });

  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create contact',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}