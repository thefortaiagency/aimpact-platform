import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { quoteId } = await request.json();

    // Fetch the quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Check if quote is accepted/signed
    if (quote.status !== 'signed' && quote.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Quote must be accepted before converting to project' },
        { status: 400 }
      );
    }

    // Create project from quote
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: quote.project_name || `Project for ${quote.client_name}`,
        description: quote.project_description || quote.description,
        organization_id: quote.organization_id,
        status: 'planning',
        budget: quote.total_amount,
        start_date: new Date().toISOString(),
        quote_id: quoteId,
        created_by: quote.created_by
      })
      .select()
      .single();

    if (projectError) {
      console.error('Error creating project:', projectError);
      return NextResponse.json(
        { error: 'Failed to create project', details: projectError.message },
        { status: 500 }
      );
    }

    // Update quote status to converted
    await supabase
      .from('quotes')
      .update({ 
        status: 'converted',
        converted_to_project_id: project.id,
        converted_at: new Date().toISOString()
      })
      .eq('id', quoteId);

    // Create initial project tasks based on quote items
    if (quote.items && Array.isArray(quote.items)) {
      const tasks = quote.items.map((item: any, index: number) => ({
        project_id: project.id,
        title: item.name || item.description,
        description: item.description,
        status: 'todo',
        priority: 'medium',
        order: index + 1,
        estimated_hours: item.hours || null,
        created_at: new Date().toISOString()
      }));

      await supabase.from('project_tasks').insert(tasks);
    }

    // Create activity log
    await supabase.from('activities').insert({
      type: 'quote_converted',
      description: `Quote #${quote.quote_number} converted to project "${project.name}"`,
      entity_type: 'project',
      entity_id: project.id,
      related_entity_type: 'quote',
      related_entity_id: quoteId,
      metadata: {
        quote_number: quote.quote_number,
        project_name: project.name,
        total_amount: quote.total_amount
      }
    });

    return NextResponse.json({
      success: true,
      project,
      message: `Quote successfully converted to project "${project.name}"`
    });

  } catch (error) {
    console.error('Quote conversion error:', error);
    return NextResponse.json(
      { error: 'Failed to convert quote to project' },
      { status: 500 }
    );
  }
}