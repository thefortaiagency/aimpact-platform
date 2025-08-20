import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client conditionally
const getSupabaseClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
};

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const organizationId = searchParams.get('organization');
    
    // Build query
    let query = supabase
      .from('projects')
      .select(`
        *,
        organization:organizations(*)
      `)
      .order('created_at', { ascending: false });
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data: projects, error } = await query;
    
    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects', details: error.message },
        { status: 500 }
      );
    }
    
    // Calculate stats
    const stats = {
      total: projects?.length || 0,
      active: projects?.filter((p: any) => p.status === 'active').length || 0,
      completed: projects?.filter((p: any) => p.status === 'completed').length || 0,
      totalBudget: projects?.reduce((sum: number, p: any) => sum + (p.budget || 0), 0) || 0
    };
    
    return NextResponse.json({
      projects: projects || [],
      stats
    });
    
  } catch (error) {
    console.error('Error in projects API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Create new project
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        name: body.name,
        description: body.description,
        status: body.status || 'planning',
        organization_id: body.organization_id,
        budget: body.budget,
        start_date: body.start_date,
        end_date: body.end_date
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json(
        { error: 'Failed to create project', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      project
    });
    
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}