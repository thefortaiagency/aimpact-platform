const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function createDetailedToledoQuote() {
  try {
    console.log('🚀 Creating detailed Toledo Tool & Die quote in Stripe...\n');
    
    // Get the existing customer
    const existingCustomers = await stripe.customers.list({
      email: 'daniel.harper@toledotool.com',
      limit: 1
    });
    
    let customer;
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
    
    // Create products for each location setup
    console.log('Creating products for each location...');
    
    // Location 1 - Toledo Main
    const location1Product = await stripe.products.create({
      name: 'Location 1: Toledo Main (Alexis Road) - Setup & Installation',
      description: 'Primary manufacturing and headquarters facility implementation'
    });
    const location1Price = await stripe.prices.create({
      product: location1Product.id,
      unit_amount: 2000000, // $20,000
      currency: 'usd',
    });
    
    // Location 2 - Toledo Bennett Road
    const location2Product = await stripe.products.create({
      name: 'Location 2: Toledo Bennett Road - Setup & Installation',
      description: '105,000 sq ft advanced manufacturing facility implementation'
    });
    const location2Price = await stripe.prices.create({
      product: location2Product.id,
      unit_amount: 1750000, // $17,500
      currency: 'usd',
    });
    
    // Location 3 - Pioneer Facility
    const location3Product = await stripe.products.create({
      name: 'Location 3: Pioneer Facility - Setup & Installation',
      description: 'Former Arcelor Mittal building (80+ employees) implementation'
    });
    const location3Price = await stripe.prices.create({
      product: location3Product.id,
      unit_amount: 1500000, // $15,000
      currency: 'usd',
    });
    
    // Core Platform Features (one-time)
    const platformProduct = await stripe.products.create({
      name: 'Core Platform Development',
      description: 'Custom branding, KPI configuration, and base platform setup'
    });
    const platformPrice = await stripe.prices.create({
      product: platformProduct.id,
      unit_amount: 0, // Included in location fees
      currency: 'usd',
    });
    
    // Paylocity Integration
    const paylocityProduct = await stripe.products.create({
      name: 'Paylocity Time Management Integration',
      description: 'Complete integration with Paylocity for time and attendance data'
    });
    const paylocityPrice = await stripe.prices.create({
      product: paylocityProduct.id,
      unit_amount: 0, // Included
      currency: 'usd',
    });
    
    // Training Package
    const trainingProduct = await stripe.products.create({
      name: 'Comprehensive Training Package',
      description: 'On-site training for operators, supervisors, management, and IT staff'
    });
    const trainingPrice = await stripe.prices.create({
      product: trainingProduct.id,
      unit_amount: 0, // Included
      currency: 'usd',
    });
    
    // Monthly subscriptions for each location
    const location1MonthlyProduct = await stripe.products.create({
      name: 'Location 1: Toledo Main - Monthly Subscription',
      description: 'Hosting, support, and continuous improvements'
    });
    const location1MonthlyPrice = await stripe.prices.create({
      product: location1MonthlyProduct.id,
      unit_amount: 250000, // $2,500/month
      currency: 'usd',
      recurring: { interval: 'month' }
    });
    
    const location2MonthlyProduct = await stripe.products.create({
      name: 'Location 2: Bennett Road - Monthly Subscription',
      description: 'Hosting, support, and continuous improvements'
    });
    const location2MonthlyPrice = await stripe.prices.create({
      product: location2MonthlyProduct.id,
      unit_amount: 225000, // $2,250/month
      currency: 'usd',
      recurring: { interval: 'month' }
    });
    
    const location3MonthlyProduct = await stripe.products.create({
      name: 'Location 3: Pioneer - Monthly Subscription',
      description: 'Hosting, support, and continuous improvements'
    });
    const location3MonthlyPrice = await stripe.prices.create({
      product: location3MonthlyProduct.id,
      unit_amount: 200000, // $2,000/month
      currency: 'usd',
      recurring: { interval: 'month' }
    });
    
    // Additional Services
    const vCIOProduct = await stripe.products.create({
      name: 'vCIO Consultation Services',
      description: 'Virtual Chief Information Officer strategic guidance'
    });
    const vCIOPrice = await stripe.prices.create({
      product: vCIOProduct.id,
      unit_amount: 0, // Included
      currency: 'usd',
      recurring: { interval: 'month' }
    });
    
    console.log('✅ Created all products and prices');
    
    // Create the detailed quote
    const quote = await stripe.quotes.create({
      customer: customer.id,
      line_items: [
        // Setup Fees Section
        { price: location1Price.id, quantity: 1 },
        { price: location2Price.id, quantity: 1 },
        { price: location3Price.id, quantity: 1 },
        { price: platformPrice.id, quantity: 1 },
        { price: paylocityPrice.id, quantity: 1 },
        { price: trainingPrice.id, quantity: 1 },
        
        // Monthly Subscriptions Section
        { price: location1MonthlyPrice.id, quantity: 1 },
        { price: location2MonthlyPrice.id, quantity: 1 },
        { price: location3MonthlyPrice.id, quantity: 1 },
        { price: vCIOPrice.id, quantity: 1 },
      ],
      expires_at: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30 days
      collection_method: 'send_invoice',
      invoice_settings: {
        days_until_due: 30
      },
      metadata: {
        project_type: 'Enterprise Production Analytics Platform',
        implementation_timeline: '6 weeks total (2 weeks per location)',
        sla_response: '4-hour urgent, 8-hour normal',
        platform_uptime: '99.9% SLA'
      },
      description: `Complete production analytics platform for 3 facilities. Real-time tracking, multi-shift management, Paylocity integration, custom KPIs. 6-week implementation, 99.9% uptime SLA.`,
      
      footer: `Payment Terms: 50% of setup upon signing, 50% upon go-live. Monthly subscription begins on go-live date. NET 30 terms.

Contact: The Fort AI Agency | AImpact Nexus Platform
Support: support@aimpactnexus.ai | Emergency: 24/7 Hotline`,
      
      header: 'Enterprise Production Analytics Platform'
    });
    
    console.log('\n✅ Quote created successfully!');
    console.log('-----------------------------------');
    console.log('Quote ID:', quote.id);
    console.log('Customer:', customer.name);
    console.log('\nSetup Fees Breakdown:');
    console.log('  Location 1 (Alexis Road): $20,000');
    console.log('  Location 2 (Bennett Road): $17,500');
    console.log('  Location 3 (Pioneer):      $15,000');
    console.log('  Total Setup:               $52,500');
    console.log('\nMonthly Subscriptions:');
    console.log('  Location 1: $2,500/month');
    console.log('  Location 2: $2,250/month');
    console.log('  Location 3: $2,000/month');
    console.log('  Total Monthly: $6,750/month');
    console.log('\nStatus:', quote.status);
    console.log('Expires:', new Date(quote.expires_at * 1000).toLocaleDateString());
    
    // Finalize the quote
    const finalizedQuote = await stripe.quotes.finalizeQuote(quote.id);
    console.log('\n✅ Quote finalized and ready to send!');
    
    console.log('\n📧 IMPORTANT NOTES:');
    console.log('1. The quote shows individual line items for each location');
    console.log('2. Client can request to remove specific locations if needed');
    console.log('3. View and customize in Stripe Dashboard:');
    console.log(`   https://dashboard.stripe.com/quotes/${quote.id}`);
    console.log('\n4. To add your logo:');
    console.log('   - Go to Stripe Dashboard > Settings > Branding');
    console.log('   - Upload The Fort AI Agency logo');
    console.log('   - It will appear on all quotes and invoices');
    console.log('\n5. To adjust line items:');
    console.log('   - Open the quote in Stripe Dashboard');
    console.log('   - Click "Edit" to modify quantities or remove items');
    console.log('   - Client can negotiate specific locations');
    
    return quote;
  } catch (error) {
    console.error('❌ Error creating quote:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.log('\nError details:', error.raw?.message);
    }
  }
}

// Create the detailed quote
createDetailedToledoQuote();