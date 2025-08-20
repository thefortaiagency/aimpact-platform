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

// Generate ticket number
const generateTicketNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TKT-${year}${month}-${random}`;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { 
      contact_id, 
      organization_id, 
      project_id,
      subject, 
      description, 
      priority = 'medium',
      category = 'general',
      auto_created = true,
      trigger_event
    } = await request.json();

    // Validate required fields
    if (!subject || !description) {
      return NextResponse.json(
        { error: 'Subject and description are required' },
        { status: 400 }
      );
    }

    // Create the ticket
    const ticketNumber = generateTicketNumber();
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        ticket_number: ticketNumber,
        subject,
        description,
        status: 'open',
        priority,
        category,
        contact_id,
        organization_id,
        project_id,
        auto_created,
        metadata: {
          trigger_event,
          created_via: 'crm_automation'
        }
      })
      .select(`
        *,
        contact:contacts(*),
        organization:organizations(*),
        project:projects(*)
      `)
      .single();

    if (ticketError) {
      console.error('Error creating ticket:', ticketError);
      return NextResponse.json(
        { error: 'Failed to create ticket', details: ticketError.message },
        { status: 500 }
      );
    }

    // Create activity log
    await supabase.from('activities').insert({
      type: 'ticket_created',
      description: `Ticket ${ticketNumber} created${auto_created ? ' automatically' : ''}: ${subject}`,
      entity_type: 'ticket',
      entity_id: ticket.id,
      contact_id,
      organization_id,
      project_id,
      metadata: {
        ticket_number: ticketNumber,
        trigger_event,
        auto_created
      }
    });

    // Send notification email if contact has email
    if (ticket.contact?.email) {
      try {
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: ticket.contact.email,
            subject: `Support Ticket Created: ${ticketNumber}`,
            html: `
              <h2>Your support ticket has been created</h2>
              <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
              <p><strong>Subject:</strong> ${subject}</p>
              <p><strong>Status:</strong> Open</p>
              <p><strong>Priority:</strong> ${priority}</p>
              <p>We'll get back to you as soon as possible.</p>
            `,
            text: `Your support ticket ${ticketNumber} has been created. Subject: ${subject}. We'll get back to you soon.`
          })
        });
      } catch (emailError) {
        console.error('Failed to send ticket notification email:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      ticket,
      message: `Ticket ${ticketNumber} created successfully`
    });

  } catch (error) {
    console.error('CRM ticket creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket from CRM' },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch tickets for a contact or organization
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const contact_id = searchParams.get('contact_id');
    const organization_id = searchParams.get('organization_id');
    const project_id = searchParams.get('project_id');

    let query = supabase
      .from('tickets')
      .select(`
        *,
        contact:contacts(*),
        organization:organizations(*),
        project:projects(*)
      `)
      .order('created_at', { ascending: false });

    if (contact_id) {
      query = query.eq('contact_id', contact_id);
    }
    if (organization_id) {
      query = query.eq('organization_id', organization_id);
    }
    if (project_id) {
      query = query.eq('project_id', project_id);
    }

    const { data: tickets, error } = await query;

    if (error) {
      console.error('Error fetching CRM tickets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tickets', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(tickets || []);

  } catch (error) {
    console.error('CRM ticket fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch CRM tickets' },
      { status: 500 }
    );
  }
}