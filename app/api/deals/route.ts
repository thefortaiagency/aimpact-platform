import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const searchParams = request.nextUrl.searchParams;
    const includePipeline = searchParams.get('includePipeline') === 'true';
    
    // For now, return an empty array as deals table might not exist
    // In a real implementation, you'd query the deals table
    const deals = [];
    
    const response = {
      success: true,
      data: deals,
      count: 0
    };
    
    if (includePipeline) {
      response.pipeline = {
        stages: [
          { id: 'lead', name: 'Lead', order: 1 },
          { id: 'qualified', name: 'Qualified', order: 2 },
          { id: 'proposal', name: 'Proposal', order: 3 },
          { id: 'negotiation', name: 'Negotiation', order: 4 },
          { id: 'closed-won', name: 'Closed Won', order: 5 },
          { id: 'closed-lost', name: 'Closed Lost', order: 6 }
        ]
      };
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch deals',
        data: []
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();
    
    // Placeholder for creating deals
    // In a real implementation, you'd insert into the deals table
    
    return NextResponse.json({
      success: true,
      data: {
        id: Date.now().toString(),
        ...body,
        created_at: new Date().toISOString(),
        stage: body.stage || 'lead',
        value: body.value || 0
      }
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create deal'
      },
      { status: 500 }
    );
  }
}