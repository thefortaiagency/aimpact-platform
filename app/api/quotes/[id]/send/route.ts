import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipientEmail } = await req.json();
    const quoteId = params.id;

    // Fetch quote details
    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // If we have a Stripe quote ID, send it through Stripe
    if (quote.stripe_quote_id && process.env.STRIPE_SECRET_KEY) {
      try {
        // Send the quote through Stripe
        const stripeQuote = await stripe.quotes.sendQuote(quote.stripe_quote_id);
        
        // Get the hosted invoice page URL
        const hostedUrl = stripeQuote.computed?.upfront?.invoice?.hosted_invoice_url || 
                         stripeQuote.computed?.recurring?.hosted_invoice_url;

        // Update quote status in database
        await supabase
          .from('quotes')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
            stripe_hosted_url: hostedUrl
          })
          .eq('id', quoteId);

        return NextResponse.json({ 
          success: true, 
          message: 'Quote sent via Stripe',
          viewUrl: hostedUrl,
          stripeQuoteId: quote.stripe_quote_id
        });
      } catch (stripeError: any) {
        console.error('Stripe send error:', stripeError);
        // Fall back to custom implementation if Stripe fails
      }
    }

    // Fallback: Generate our own viewing URL if no Stripe quote
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://impact.aimpactnexus.ai';
    const viewUrl = `${baseUrl}/quotes/view/${quoteId}`;

    // Update quote status
    await supabase
      .from('quotes')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', quoteId);

    return NextResponse.json({ 
      success: true, 
      message: 'Quote marked as sent (Stripe not configured)',
      viewUrl,
      note: 'Configure Stripe secret key to enable automated sending'
    });
  } catch (error) {
    console.error('Error in send quote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}