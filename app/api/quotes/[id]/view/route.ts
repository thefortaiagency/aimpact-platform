import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;

    // Fetch quote details
    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Update view count and viewed_at timestamp
    await supabase
      .from('quotes')
      .update({ 
        view_count: (quote.view_count || 0) + 1,
        viewed_at: new Date().toISOString(),
        status: quote.status === 'sent' ? 'viewed' : quote.status
      })
      .eq('id', quoteId);

    return NextResponse.json({
      id: quote.id,
      clientName: quote.client_name,
      clientEmail: quote.client_email,
      projectName: quote.project_name,
      amountMin: quote.amount_min,
      amountMax: quote.amount_max,
      description: quote.description,
      scope: quote.scope,
      deliverables: quote.deliverables,
      timeline: quote.timeline,
      paymentTerms: quote.payment_terms,
      status: quote.status,
      createdAt: quote.created_at,
      validUntil: quote.valid_until
    });
  } catch (error) {
    console.error('Error viewing quote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    const body = await req.json();
    const { action, signature } = body;

    if (action === 'sign') {
      // Update quote with signature
      const { error } = await supabase
        .from('quotes')
        .update({ 
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature: {
            signerName: signature.name,
            signerEmail: signature.email,
            signerTitle: signature.title,
            signedAt: new Date().toISOString(),
            ipAddress: signature.ipAddress,
            userAgent: signature.userAgent
          }
        })
        .eq('id', quoteId);

      if (error) {
        console.error('Error signing quote:', error);
        return NextResponse.json({ error: 'Failed to sign quote' }, { status: 500 });
      }

      // Send notification email about signed quote
      // (You can implement this later)

      return NextResponse.json({ 
        success: true, 
        message: 'Quote signed successfully' 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing quote action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}