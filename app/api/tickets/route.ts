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
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Build query
    let query = supabase
      .from('tickets')
      .select(`
        *,
        contact:contacts(*),
        organization:organizations(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }
    
    const { data: tickets, error } = await query;
    
    if (error) {
      console.error('Error fetching tickets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tickets', details: error.message },
        { status: 500 }
      );
    }
    
    // Get ticket counts by status
    const { data: statusCounts } = await supabase
      .from('tickets')
      .select('status')
      .then(result => {
        if (!result.data) return { data: null };
        const counts = result.data.reduce((acc: any, ticket: any) => {
          acc[ticket.status] = (acc[ticket.status] || 0) + 1;
          return acc;
        }, {});
        return { data: counts };
      });
    
    // Get recent activity (last 10 tickets)
    const { data: recentActivity } = await supabase
      .from('tickets')
      .select('id, ticket_number, subject, status, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    // Format tickets for the frontend component
    const formattedTickets = (tickets || []).map((ticket: any) => ({
      id: ticket.id,
      number: ticket.ticket_number,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      customer: ticket.contact ? {
        name: `${ticket.contact.first_name || ''} ${ticket.contact.last_name || ''}`.trim() || ticket.contact.email,
        email: ticket.contact.email,
        company: ticket.organization?.name
      } : {
        name: 'Unknown',
        email: '',
        company: ''
      },
      assignee: ticket.assigned_to ? {
        name: ticket.assigned_to.name || ticket.assigned_to.email,
        avatar: ticket.assigned_to.avatar_url
      } : null,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      lastResponse: ticket.last_response_at || ticket.created_at,
      sla: {
        responseTime: 30, // Default 30 minutes
        resolutionTime: 24 // Default 24 hours
      },
      tags: ticket.tags || [],
      messages: [], // We'll add messages later
      attachments: [],
      aiInsights: ticket.ai_insights
    }));
    
    // Calculate stats
    const openCount = formattedTickets.filter((t: any) => t.status === 'open').length;
    const resolvedToday = formattedTickets.filter((t: any) => {
      const created = new Date(t.createdAt);
      const today = new Date();
      return t.status === 'resolved' && 
             created.toDateString() === today.toDateString();
    }).length;
    
    return NextResponse.json({
      tickets: formattedTickets,
      stats: {
        totalTickets: formattedTickets.length,
        openTickets: openCount,
        resolvedToday: resolvedToday,
        avgResponseTime: '15m',
        slaCompliance: 95,
        byStatus: statusCounts || {},
        recentActivity: recentActivity || []
      }
    });
    
  } catch (error) {
    console.error('Error in tickets API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Create new ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    
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
    
    // Create ticket
    const { data: ticket, error } = await supabase
      .from('tickets')
      .insert({
        ticket_number: ticketNumber,
        subject: body.subject,
        description: body.description,
        status: body.status || 'open',
        priority: body.priority || 'medium',
        category: body.category || 'general',
        contact_id: body.contact_id,
        organization_id: body.organization_id,
        assigned_to: body.assigned_to,
        ai_insights: body.ai_insights
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating ticket:', error);
      return NextResponse.json(
        { error: 'Failed to create ticket', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      ticket
    });
    
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Update ticket
export async function PATCH(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Ticket ID is required' },
        { status: 400 }
      );
    }
    
    const { data: ticket, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating ticket:', error);
      return NextResponse.json(
        { error: 'Failed to update ticket', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      ticket
    });
    
  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}