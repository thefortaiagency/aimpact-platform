import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quoteId = params.id;
    
    // Special handling for Toledo quote
    if (quoteId === 'toledo-2025' || quoteId === '2025-001') {
      // Return hardcoded Toledo quote data
      return NextResponse.json({
        id: 'qt_1RyOKdQe1Z2kDcIZtg2K6onA',
        clientName: 'Toledo Tool & Die Company, Inc.',
        clientEmail: 'daniel.harper@toledotool.com',
        projectType: 'Enterprise Production Analytics Platform',
        setupTotal: 52500,
        monthlyTotal: 6000,
        expiresAt: '2025-09-19',
        status: 'open',
        lineItems: [
          // Setup fees
          { description: 'Location 1: Toledo Main (Alexis Road) - Setup & Installation', amount: 20000, recurring: false },
          { description: 'Location 2: Toledo Bennett Road - Setup & Installation', amount: 17500, recurring: false },
          { description: 'Location 3: Pioneer Facility - Setup & Installation', amount: 15000, recurring: false },
          // Monthly subscriptions
          { description: 'Location 1: Toledo Main - Monthly Subscription', amount: 2000, recurring: true },
          { description: 'Location 2: Bennett Road - Monthly Subscription', amount: 2000, recurring: true },
          { description: 'Location 3: Pioneer - Monthly Subscription', amount: 2000, recurring: true },
          // Included services
          { description: 'Core Platform Development', amount: 0, recurring: false, included: true },
          { description: 'Cloud Web Application Hosting', amount: 0, recurring: false, included: true },
          { description: 'Cloud Database Hosting', amount: 0, recurring: false, included: true },
          { description: 'Multi-Factor Authentication (MFA) Setup', amount: 0, recurring: false, included: true },
          { description: 'Monthly Onsite Visit', amount: 0, recurring: false, included: true },
          { description: 'Paylocity Time Management Integration', amount: 0, recurring: false, included: true },
          { description: 'Comprehensive Training Package', amount: 0, recurring: false, included: true },
          { description: 'Plex Integration', amount: 0, recurring: false, included: true },
          { description: 'AI Model Tuning & Optimization', amount: 0, recurring: false, included: true },
          { description: 'vCIO Consultation Services', amount: 0, recurring: false, included: true },
        ],
        description: '3-facility production analytics platform with 6-week implementation and 99.9% uptime SLA.',
        stripeQuoteId: 'qt_1RyOKdQe1Z2kDcIZtg2K6onA',
        stripeQuoteUrl: 'https://dashboard.stripe.com/quotes/qt_1RyOKdQe1Z2kDcIZtg2K6onA'
      });
    }
    
    // For actual Stripe quote IDs
    if (quoteId.startsWith('qt_')) {
      try {
        const quote = await stripe.quotes.retrieve(quoteId);
        const lineItems = await stripe.quotes.listLineItems(quoteId, { limit: 100 });
        
        // Format the data
        const formattedLineItems = lineItems.data.map(item => ({
          description: item.description || 'Service',
          amount: item.price.unit_amount ? item.price.unit_amount / 100 : 0,
          recurring: item.price.recurring !== null,
          included: item.price.unit_amount === 0
        }));
        
        const setupTotal = formattedLineItems
          .filter(item => !item.recurring && item.amount > 0)
          .reduce((sum, item) => sum + item.amount, 0);
        
        const monthlyTotal = formattedLineItems
          .filter(item => item.recurring && item.amount > 0)
          .reduce((sum, item) => sum + item.amount, 0);
        
        return NextResponse.json({
          id: quote.id,
          clientName: 'Toledo Tool & Die Company, Inc.',
          clientEmail: 'daniel.harper@toledotool.com',
          projectType: 'Enterprise Production Analytics Platform',
          setupTotal,
          monthlyTotal,
          expiresAt: new Date(quote.expires_at * 1000).toISOString(),
          status: quote.status,
          lineItems: formattedLineItems,
          description: quote.description || '',
          stripeQuoteId: quote.id,
          stripeQuoteUrl: `https://dashboard.stripe.com/quotes/${quote.id}`
        });
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        return NextResponse.json(
          { error: 'Quote not found' },
          { status: 404 }
        );
      }
    }
    
    // Default error
    return NextResponse.json(
      { error: 'Invalid quote ID' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}