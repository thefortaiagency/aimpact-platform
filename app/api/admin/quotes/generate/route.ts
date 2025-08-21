import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Stripe from 'stripe';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Stripe - will need secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      clientName, 
      clientEmail, 
      projectType, 
      projectDescription, 
      budget,
      timeline,
      additionalNotes 
    } = body;

    // Generate quote content using AI
    const prompt = `Generate a professional project quote for:
Client: ${clientName}
Project Type: ${projectType}
Description: ${projectDescription}
Budget Range: ${budget}
Timeline: ${timeline}
Additional Notes: ${additionalNotes || 'None'}

Please generate:
1. A compelling project name
2. A detailed scope of work (bullet points)
3. Specific deliverables
4. Payment terms
5. Project timeline with milestones
6. Price range (min and max based on the budget)

Format as JSON with keys: projectName, scope, deliverables, paymentTerms, timeline, amountMin, amountMax`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a professional business consultant helping create project quotes. Generate realistic and professional quotes based on the information provided."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const generatedQuote = JSON.parse(completion.choices[0].message.content || '{}');

    // First, create or get Stripe customer
    let stripeCustomer;
    try {
      // Check if customer exists
      const customers = await stripe.customers.list({
        email: clientEmail,
        limit: 1
      });

      if (customers.data.length > 0) {
        stripeCustomer = customers.data[0];
      } else {
        // Create new customer
        stripeCustomer = await stripe.customers.create({
          name: clientName,
          email: clientEmail,
          metadata: {
            created_by: session.user?.email || 'system'
          }
        });
      }
    } catch (stripeError) {
      console.error('Stripe customer error:', stripeError);
      // Continue without Stripe for now if there's an error
    }

    // Create Stripe Quote if we have a customer
    let stripeQuote;
    if (stripeCustomer && process.env.STRIPE_SECRET_KEY) {
      try {
        // Calculate the average amount for the line item
        const amount = Math.round((generatedQuote.amountMin + generatedQuote.amountMax) / 2);
        
        stripeQuote = await stripe.quotes.create({
          customer: stripeCustomer.id,
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: generatedQuote.projectName || projectType,
                description: generatedQuote.scope || projectDescription,
              },
              unit_amount: amount * 100, // Stripe uses cents
            },
            quantity: 1,
          }],
          expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days from now
          metadata: {
            project_type: projectType,
            timeline: generatedQuote.timeline || timeline,
            deliverables: generatedQuote.deliverables || '',
            payment_terms: generatedQuote.paymentTerms || 'Net 30'
          },
          collection_method: 'send_invoice',
          footer: 'Thank you for choosing AImpact Nexus!',
          header: 'Project Quote from AImpact Nexus',
        });

        // Finalize the quote to make it sendable
        await stripe.quotes.finalizeQuote(stripeQuote.id);
      } catch (stripeError) {
        console.error('Stripe quote error:', stripeError);
        // Continue without Stripe quote if there's an error
      }
    }

    // Create the quote in database (with Stripe ID if available)
    const { data: quote, error } = await supabase
      .from('quotes')
      .insert({
        client_name: clientName,
        client_email: clientEmail,
        project_name: generatedQuote.projectName || projectType,
        amount_min: generatedQuote.amountMin || 1000,
        amount_max: generatedQuote.amountMax || 5000,
        status: 'draft',
        description: projectDescription,
        scope: generatedQuote.scope || projectDescription,
        deliverables: generatedQuote.deliverables,
        timeline: generatedQuote.timeline || timeline,
        payment_terms: generatedQuote.paymentTerms || 'Net 30',
        created_by: session.user?.email,
        stripe_quote_id: stripeQuote?.id,
        stripe_customer_id: stripeCustomer?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quote:', error);
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      stripeQuoteId: stripeQuote?.id,
      stripeQuoteUrl: stripeQuote?.id ? `https://dashboard.stripe.com/quotes/${stripeQuote.id}` : null,
      quote: {
        id: quote.id,
        clientName: quote.client_name,
        clientEmail: quote.client_email,
        projectName: quote.project_name,
        amountMin: quote.amount_min,
        amountMax: quote.amount_max,
        status: quote.status,
        scope: quote.scope,
        deliverables: quote.deliverables,
        timeline: quote.timeline,
        paymentTerms: quote.payment_terms,
        createdAt: quote.created_at,
        stripeQuoteId: stripeQuote?.id
      }
    });
  } catch (error) {
    console.error('Error generating quote:', error);
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    );
  }
}