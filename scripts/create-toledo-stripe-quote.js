const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function createToledoQuote() {
  try {
    console.log('🚀 Creating Toledo Tool & Die quote in Stripe...\n');
    
    // First, create or get the customer
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: 'daniel.harper@toledotool.com',
      limit: 1
    });
    
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('✅ Found existing customer:', customer.name);
    } else {
      customer = await stripe.customers.create({
        name: 'Toledo Tool & Die Company, Inc.',
        email: 'daniel.harper@toledotool.com',
        description: 'Metal Stamping & Manufacturing - 200+ employees across 3 locations',
        address: {
          line1: '105 W Alexis Rd',
          city: 'Toledo',
          state: 'OH',
          postal_code: '43612',
          country: 'US'
        },
        phone: '(419) 476-4422',
        metadata: {
          contact_person: 'Dan Harper',
          company_size: '200+ employees',
          locations: '3 facilities',
          industry: 'Metal Stamping & Manufacturing'
        }
      });
      console.log('✅ Created new customer:', customer.name);
    }
    
    // First create products and prices
    const setupProduct = await stripe.products.create({
      name: 'Enterprise Production Analytics Platform - Setup & Installation',
      description: `Complete implementation for 3 manufacturing facilities. Includes on-site assessment, custom development, system integrations, and training.`
    });
    
    const setupPrice = await stripe.prices.create({
      product: setupProduct.id,
      unit_amount: 5250000, // $52,500 in cents
      currency: 'usd',
    });
    
    const subscriptionProduct = await stripe.products.create({
      name: 'Enterprise Bundle - Monthly Subscription (3 Locations)',
      description: `Ongoing services for all 3 facilities including hosting, monitoring, support, and continuous improvements.`
    });
    
    const subscriptionPrice = await stripe.prices.create({
      product: subscriptionProduct.id,
      unit_amount: 600000, // $6,000 in cents
      currency: 'usd',
      recurring: {
        interval: 'month'
      }
    });
    
    console.log('✅ Created products and prices');
    
    // Create the quote with line items
    const quote = await stripe.quotes.create({
      customer: customer.id,
      line_items: [
        {
          price: setupPrice.id,
          quantity: 1,
        },
        {
          price: subscriptionPrice.id,
          quantity: 1,
        }
      ],
      expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      collection_method: 'send_invoice',
      invoice_settings: {
        days_until_due: 30
      },
      metadata: {
        project_type: 'Enterprise Production Analytics Platform',
        implementation_timeline: '6 weeks',
        locations: '3 facilities',
        estimated_roi: '6-8 months',
        annual_savings: '$225,000+',
        sla: '99.9% uptime, 4-hour urgent response'
      },
      description: `Enterprise Production Analytics Platform for Toledo Tool & Die

This comprehensive solution will transform your production data management across all three facilities, providing real-time visibility, automated reporting, and advanced analytics to drive continuous improvement.

Expected ROI: 6-8 months
Estimated Annual Savings: $225,000+
Implementation Timeline: 6 weeks (2 weeks per location)`,
      footer: `Terms: 50% of setup fee upon signing, 50% upon go-live. Monthly subscription begins on go-live date. NET 30 payment terms. 12-month initial term with 30-day termination notice. Price protection for 24 months.

Thank you for choosing The Fort AI Agency and AImpact Nexus!`,
      header: 'Enterprise Production Analytics Platform Quote'
    });
    
    console.log('\n✅ Quote created successfully!');
    console.log('-----------------------------------');
    console.log('Quote ID:', quote.id);
    console.log('Customer:', customer.name);
    console.log('Total Setup:', '$52,500');
    console.log('Monthly Subscription:', '$6,000');
    console.log('Status:', quote.status);
    console.log('Expires:', new Date(quote.expires_at * 1000).toLocaleDateString());
    
    // Finalize the quote to make it sendable
    const finalizedQuote = await stripe.quotes.finalizeQuote(quote.id);
    console.log('\n✅ Quote finalized and ready to send!');
    
    // Get the PDF URL
    if (finalizedQuote.pdf) {
      console.log('\n📄 Quote PDF:', finalizedQuote.pdf);
    }
    
    console.log('\n📧 Next Steps:');
    console.log('1. View in Stripe Dashboard:');
    console.log(`   https://dashboard.stripe.com/quotes/${quote.id}`);
    console.log('\n2. Send to client via Stripe:');
    console.log('   - Click "Send quote" in Stripe Dashboard');
    console.log('   - Or use the platform\'s Send button');
    console.log('\n3. Client receives professional quote with:');
    console.log('   - Secure payment collection');
    console.log('   - Electronic signature');
    console.log('   - Automatic invoice generation upon acceptance');
    
    return quote;
  } catch (error) {
    console.error('❌ Error creating quote:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.log('\nError details:', error.raw?.message);
    }
  }
}

// Create the quote
createToledoQuote();