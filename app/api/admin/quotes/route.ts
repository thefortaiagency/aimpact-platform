import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch quotes from database
    const { data: quotes, error } = await supabase
      .from('quotes')
      .select(`
        *,
        organization:organization_id (
          id,
          name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching quotes:', error);
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
    }

    // Format quotes for frontend
    const formattedQuotes = (quotes || []).map(quote => ({
      id: quote.id,
      clientName: quote.client_name || quote.organization?.name || 'Unknown Client',
      clientEmail: quote.client_email || quote.organization?.email || '',
      projectName: quote.project_name || 'Untitled Project',
      amountMin: quote.amount_min || 0,
      amountMax: quote.amount_max || 0,
      status: quote.status || 'draft',
      createdAt: quote.created_at,
      sentAt: quote.sent_at,
      viewedAt: quote.viewed_at,
      signedAt: quote.signed_at,
      closedAt: quote.closed_at,
      signature: quote.signature,
      viewCount: quote.view_count || 0,
      organization_id: quote.organization_id
    }));

    return NextResponse.json(formattedQuotes);
  } catch (error) {
    console.error('Error in quotes GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Create new quote
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        client_name: body.clientName,
        client_email: body.clientEmail,
        project_name: body.projectName,
        amount_min: body.amountMin,
        amount_max: body.amountMax,
        status: 'draft',
        description: body.description,
        scope: body.scope,
        timeline: body.timeline,
        payment_terms: body.paymentTerms,
        organization_id: body.organizationId,
        created_by: session.user?.email
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quote:', error);
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      quote: {
        id: quote.id,
        clientName: quote.client_name,
        clientEmail: quote.client_email,
        projectName: quote.project_name,
        amountMin: quote.amount_min,
        amountMax: quote.amount_max,
        status: quote.status,
        createdAt: quote.created_at
      }
    });
  } catch (error) {
    console.error('Error in quotes POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}