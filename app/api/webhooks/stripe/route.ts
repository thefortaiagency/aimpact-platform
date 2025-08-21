import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = headers().get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'quote.accepted': {
        const quote = event.data.object as Stripe.Quote;
        
        // Update quote status in database
        await supabase
          .from('quotes')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('stripe_quote_id', quote.id);
        
        console.log('Quote accepted:', quote.id);
        break;
      }

      case 'quote.canceled': {
        const quote = event.data.object as Stripe.Quote;
        
        await supabase
          .from('quotes')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString()
          })
          .eq('stripe_quote_id', quote.id);
        
        console.log('Quote canceled:', quote.id);
        break;
      }

      case 'quote.finalized': {
        const quote = event.data.object as Stripe.Quote;
        
        await supabase
          .from('quotes')
          .update({
            status: 'finalized',
            finalized_at: new Date().toISOString()
          })
          .eq('stripe_quote_id', quote.id);
        
        console.log('Quote finalized:', quote.id);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        
        // Check if this invoice is related to a quote
        if (invoice.quote) {
          await supabase
            .from('quotes')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              invoice_id: invoice.id
            })
            .eq('stripe_quote_id', invoice.quote);
          
          console.log('Quote invoice paid:', invoice.quote);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.quote) {
          await supabase
            .from('quotes')
            .update({
              status: 'payment_failed',
              payment_failed_at: new Date().toISOString()
            })
            .eq('stripe_quote_id', invoice.quote);
          
          console.log('Quote payment failed:', invoice.quote);
        }
        break;
      }

      case 'customer.created':
      case 'customer.updated': {
        const customer = event.data.object as Stripe.Customer;
        
        // Update customer info in database if needed
        console.log('Customer event:', event.type, customer.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}