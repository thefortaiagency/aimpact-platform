import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Update the contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        first_name: body.first_name,
        last_name: body.last_name || '',
        email: body.email || `${body.phone?.replace(/\D/g, '')}@sms.local`,
        phone: body.phone || null,
        position: body.position || null,
        organization_id: body.organization_id || null,
        notes: body.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Delete the contact
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', params.id);

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