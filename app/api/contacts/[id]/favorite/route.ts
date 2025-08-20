import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Update the favorite status
    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        is_favorite: body.is_favorite,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating favorite status:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      contact,
      message: 'Favorite status updated'
    });

  } catch (error) {
    console.error('Error updating favorite:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to update favorite status',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}