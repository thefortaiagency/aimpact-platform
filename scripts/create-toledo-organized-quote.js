const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function createOrganizedToledoQuote() {
  try {
    console.log('🚀 Creating organized Toledo Tool & Die quote in Stripe...\n');
    
    // Get or create customer
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
    
    console.log('Creating products and organizing by category...\n');
    
    // ============================================
    // SECTION 1: SETUP & INSTALLATION FEES
    // ============================================
    
    // Location 1 - Toledo Main Setup
    const location1SetupProduct = await stripe.products.create({
      name: 'Location 1: Toledo Main (Alexis Road) - Setup & Installation',
      description: 'Primary manufacturing and headquarters facility implementation'
    });
    const location1SetupPrice = await stripe.prices.create({
      product: location1SetupProduct.id,
      unit_amount: 2000000, // $20,000
      currency: 'usd',
    });
    
    // Location 2 - Toledo Bennett Road Setup
    const location2SetupProduct = await stripe.products.create({
      name: 'Location 2: Toledo Bennett Road - Setup & Installation',
      description: '105,000 sq ft advanced manufacturing facility implementation'
    });
    const location2SetupPrice = await stripe.prices.create({
      product: location2SetupProduct.id,
      unit_amount: 1750000, // $17,500
      currency: 'usd',
    });
    
    // Location 3 - Pioneer Facility Setup
    const location3SetupProduct = await stripe.products.create({
      name: 'Location 3: Pioneer Facility - Setup & Installation',
      description: 'Former Arcelor Mittal building (80+ employees) implementation'
    });
    const location3SetupPrice = await stripe.prices.create({
      product: location3SetupProduct.id,
      unit_amount: 1500000, // $15,000
      currency: 'usd',
    });
    
    // ============================================
    // SECTION 2: MONTHLY SUBSCRIPTIONS
    // ============================================
    
    // Location 1 Monthly - $2,000 (3-location bundle rate)
    const location1MonthlyProduct = await stripe.products.create({
      name: 'Location 1: Toledo Main - Monthly Subscription',
      description: 'Hosting, support, and continuous improvements'
    });
    const location1MonthlyPrice = await stripe.prices.create({
      product: location1MonthlyProduct.id,
      unit_amount: 200000, // $2,000/month (3-location bundle rate)
      currency: 'usd',
      recurring: { interval: 'month' }
    });
    
    // Location 2 Monthly - $2,000 (3-location bundle rate)
    const location2MonthlyProduct = await stripe.products.create({
      name: 'Location 2: Bennett Road - Monthly Subscription',
      description: 'Hosting, support, and continuous improvements'
    });
    const location2MonthlyPrice = await stripe.prices.create({
      product: location2MonthlyProduct.id,
      unit_amount: 200000, // $2,000/month (3-location bundle rate)
      currency: 'usd',
      recurring: { interval: 'month' }
    });
    
    // Location 3 Monthly - $2,000 (3-location bundle rate)
    const location3MonthlyProduct = await stripe.products.create({
      name: 'Location 3: Pioneer - Monthly Subscription',
      description: 'Hosting, support, and continuous improvements'
    });
    const location3MonthlyPrice = await stripe.prices.create({
      product: location3MonthlyProduct.id,
      unit_amount: 200000, // $2,000/month (3-location bundle rate)
      currency: 'usd',
      recurring: { interval: 'month' }
    });
    
    // ============================================
    // SECTION 3: INCLUDED SERVICES ($0 items)
    // ============================================
    
    // Core Platform Features (included)
    const platformProduct = await stripe.products.create({
      name: 'Core Platform Development',
      description: 'Custom branding, KPI configuration, and base platform setup - INCLUDED'
    });
    const platformPrice = await stripe.prices.create({
      product: platformProduct.id,
      unit_amount: 0, // Included
      currency: 'usd',
    });
    
    // Paylocity Integration (included)
    const paylocityProduct = await stripe.products.create({
      name: 'Paylocity Time Management Integration',
      description: 'Complete integration with Paylocity for time and attendance data - INCLUDED'
    });
    const paylocityPrice = await stripe.prices.create({
      product: paylocityProduct.id,
      unit_amount: 0, // Included
      currency: 'usd',
    });
    
    // Training Package (included)
    const trainingProduct = await stripe.products.create({
      name: 'Comprehensive Training Package',
      description: 'On-site training for operators, supervisors, management, and IT staff - INCLUDED'
    });
    const trainingPrice = await stripe.prices.create({
      product: trainingProduct.id,
      unit_amount: 0, // Included
      currency: 'usd',
    });
    
    // vCIO Services (included)
    const vCIOProduct = await stripe.products.create({
      name: 'vCIO Consultation Services',
      description: 'Virtual Chief Information Officer strategic guidance - INCLUDED'
    });
    const vCIOPrice = await stripe.prices.create({
      product: vCIOProduct.id,
      unit_amount: 0, // Included
      currency: 'usd',
      recurring: { interval: 'month' }
    });
    
    // 24/7 Support (included)
    const supportProduct = await stripe.products.create({
      name: '24/7 Priority Support',
      description: '4-hour urgent response, 8-hour normal response - INCLUDED'
    });
    const supportPrice = await stripe.prices.create({
      product: supportProduct.id,
      unit_amount: 0, // Included
      currency: 'usd',
    });
    
    console.log('✅ Created all products and prices\n');
    
    // Create the organized quote with proper sections
    const quote = await stripe.quotes.create({
      customer: customer.id,
      line_items: [
        // SECTION 1: Setup & Installation
        { price: location1SetupPrice.id, quantity: 1 },
        { price: location2SetupPrice.id, quantity: 1 },
        { price: location3SetupPrice.id, quantity: 1 },
        
        // SECTION 2: Monthly Subscriptions (right after setup)
        { price: location1MonthlyPrice.id, quantity: 1 },
        { price: location2MonthlyPrice.id, quantity: 1 },
        { price: location3MonthlyPrice.id, quantity: 1 },
        
        // SECTION 3: Included Services ($0 items at bottom)
        { price: platformPrice.id, quantity: 1 },
        { price: paylocityPrice.id, quantity: 1 },
        { price: trainingPrice.id, quantity: 1 },
        { price: vCIOPrice.id, quantity: 1 },
        { price: supportPrice.id, quantity: 1 },
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
        platform_uptime: '99.9% SLA',
        pricing_tier: '3-location bundle rate'
      },
      description: `3-facility production analytics platform. PRICING: 1 location=$2,500/mo, 2 locations=$2,250/mo each, 3 locations=$2,000/mo each (YOUR RATE). 6-week implementation, 99.9% uptime SLA.`,
      
      footer: `PAYMENT TERMS: 50% of setup upon signing, 50% upon go-live. Monthly subscription begins on go-live date. NET 30 terms.

PRICING NOTE: Monthly rate of $2,000/location applies with 3-location commitment. Rate adjusts if locations are removed: 2 locations = $2,250/location, 1 location = $2,500/month.

Contact: The Fort AI Agency | AImpact Nexus Platform
Support: support@aimpactnexus.ai | Emergency: 24/7 Hotline`,
      
      header: 'Enterprise Production Analytics Platform'
    });
    
    console.log('✅ Quote created successfully!');
    console.log('-----------------------------------');
    console.log('Quote ID:', quote.id);
    console.log('Customer:', customer.name);
    console.log('\n📋 QUOTE STRUCTURE:');
    console.log('\nSETUP FEES:');
    console.log('  Location 1 (Alexis Road): $20,000');
    console.log('  Location 2 (Bennett Road): $17,500');
    console.log('  Location 3 (Pioneer):      $15,000');
    console.log('  -------------------------------');
    console.log('  Total Setup:               $52,500');
    console.log('\nMONTHLY SUBSCRIPTIONS:');
    console.log('  Location 1: $2,000/month');
    console.log('  Location 2: $2,000/month');
    console.log('  Location 3: $2,000/month');
    console.log('  -------------------------------');
    console.log('  Total Monthly: $6,000/month');
    console.log('\nINCLUDED SERVICES (at $0):');
    console.log('  ✓ Core Platform Development');
    console.log('  ✓ Paylocity Integration');
    console.log('  ✓ Comprehensive Training');
    console.log('  ✓ vCIO Consultation');
    console.log('  ✓ 24/7 Priority Support');
    console.log('\nStatus:', quote.status);
    console.log('Expires:', new Date(quote.expires_at * 1000).toLocaleDateString());
    
    // Finalize the quote
    const finalizedQuote = await stripe.quotes.finalizeQuote(quote.id);
    console.log('\n✅ Quote finalized and ready to send!');
    
    console.log('\n📧 IMPORTANT NOTES:');
    console.log('1. Quote is organized with setup fees, then monthly, then included items');
    console.log('2. Monthly pricing shows $2,000/location (3-location bundle rate)');
    console.log('3. Pricing tiers are explained in the description');
    console.log('4. View and send in Stripe Dashboard:');
    console.log(`   https://dashboard.stripe.com/quotes/${quote.id}`);
    console.log('\n5. To add AI Tuning ($1,500/month):');
    console.log('   - Edit quote and add Price ID: price_1RyNw0Qe1Z2kDcIZtR887k3F');
    console.log('   - This would bring total monthly to $7,500');
    
    return quote;
  } catch (error) {
    console.error('❌ Error creating quote:', error.message);
    if (error.type === 'StripeInvalidRequestError') {
      console.log('\nError details:', error.raw?.message);
    }
  }
}

// Create the organized quote
createOrganizedToledoQuote();