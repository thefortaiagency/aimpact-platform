const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function setupPaymentFlow() {
  try {
    console.log('📊 Toledo Quote Payment Setup Guide\n');
    console.log('=====================================\n');
    
    const quoteId = 'qt_1RyOAwQe1Z2kDcIZkPioAp76';
    
    // Get the quote details
    const quote = await stripe.quotes.retrieve(quoteId);
    
    console.log('QUOTE DETAILS:');
    console.log('- Quote ID:', quote.id);
    console.log('- Customer:', quote.customer);
    console.log('- Status:', quote.status);
    console.log('- Amount:', `$${(quote.amount_total / 100).toLocaleString()}`);
    
    console.log('\n📧 STEP 1: SEND THE QUOTE');
    console.log('============================');
    console.log('Option A - Via Stripe Dashboard:');
    console.log(`1. Go to: https://dashboard.stripe.com/quotes/${quoteId}`);
    console.log('2. Click "Send quote" button');
    console.log('3. Customize email message (optional)');
    console.log('4. Click "Send"');
    
    console.log('\nOption B - Programmatically (uncomment code below):');
    console.log('----------------------------------------');
    
    // Uncomment to actually send the quote
    /*
    const sentQuote = await stripe.quotes.update(quoteId, {
      // Add any custom fields here if needed
    });
    
    // Send the quote email
    await stripe.quotes.send(quoteId);
    console.log('✅ Quote sent to client!');
    */
    
    console.log('\n💳 STEP 2: PAYMENT COLLECTION OPTIONS');
    console.log('========================================');
    console.log('When Toledo accepts the quote, they can pay via:');
    console.log('');
    console.log('1. CREDIT CARD:');
    console.log('   - Immediate payment processing');
    console.log('   - 2.9% + 30¢ Stripe fee');
    console.log('   - Best for smaller amounts');
    
    console.log('\n2. ACH BANK TRANSFER:');
    console.log('   - Lower fees (0.8%, capped at $5)');
    console.log('   - 3-5 business days to clear');
    console.log('   - Best for large amounts like $52,500 setup');
    
    console.log('\n3. WIRE TRANSFER:');
    console.log('   - $0 fees for amounts over $5,000');
    console.log('   - Same-day processing');
    console.log('   - Requires manual reconciliation');
    
    console.log('\n4. CHECK:');
    console.log('   - Mail to address on invoice');
    console.log('   - Manual marking as paid in Stripe');
    
    console.log('\n📋 STEP 3: INVOICE CONFIGURATION');
    console.log('===================================');
    console.log('Current Settings:');
    console.log('- Payment Terms: NET 30');
    console.log('- Collection: Send invoice (not immediate charge)');
    
    console.log('\nTo modify payment terms:');
    console.log('1. Edit quote before sending');
    console.log('2. Change invoice_settings.days_until_due');
    console.log('3. Options: immediate, 7, 15, 30, 60, 90 days');
    
    console.log('\n🔄 STEP 4: AFTER ACCEPTANCE');
    console.log('==============================');
    console.log('What happens when Toledo accepts:');
    console.log('');
    console.log('1. AUTOMATIC ACTIONS:');
    console.log('   ✓ Quote converts to invoice');
    console.log('   ✓ Subscriptions activate (start date configurable)');
    console.log('   ✓ Customer receives confirmation email');
    console.log('   ✓ Your webhook receives notification');
    
    console.log('\n2. MANUAL FOLLOW-UP:');
    console.log('   • Send welcome email with project timeline');
    console.log('   • Schedule kickoff meeting');
    console.log('   • Create project in project management system');
    console.log('   • Assign implementation team');
    
    console.log('\n💰 STEP 5: CUSTOM PAYMENT SCHEDULE');
    console.log('=====================================');
    console.log('For 50% upfront, 50% on completion:');
    console.log('');
    console.log('Option 1 - Two Separate Invoices:');
    console.log('1. Create invoice for $26,250 (50% of setup)');
    console.log('2. Due immediately upon signing');
    console.log('3. Create second invoice for $26,250');
    console.log('4. Send upon go-live completion');
    
    console.log('\nOption 2 - Payment Schedule (requires Stripe Billing):');
    console.log('1. Set up phased billing schedule');
    console.log('2. Automatic invoicing at milestones');
    
    console.log('\n📊 VIEWING PAYMENT STATUS');
    console.log('===========================');
    console.log('Track everything at:');
    console.log(`https://dashboard.stripe.com/quotes/${quoteId}`);
    console.log('');
    console.log('Dashboard shows:');
    console.log('• Quote status (draft/sent/accepted/canceled)');
    console.log('• Payment status (pending/paid/overdue)');
    console.log('• Customer interactions (views, downloads)');
    console.log('• Related invoices and subscriptions');
    
    console.log('\n🎯 QUICK ACTIONS');
    console.log('==================');
    console.log(`1. Send Quote Now: https://dashboard.stripe.com/quotes/${quoteId}`);
    console.log(`2. View Customer: https://dashboard.stripe.com/customers/${quote.customer}`);
    console.log('3. Create Manual Invoice: https://dashboard.stripe.com/invoices/create');
    console.log('4. View All Quotes: https://dashboard.stripe.com/quotes');
    
    console.log('\n📱 CLIENT EXPERIENCE');
    console.log('======================');
    console.log('When Dan Harper receives the quote:');
    console.log('1. Opens email with quote summary');
    console.log('2. Clicks "Review quote" button');
    console.log('3. Views detailed line items');
    console.log('4. Can download PDF');
    console.log('5. Clicks "Accept and pay"');
    console.log('6. Enters payment information');
    console.log('7. Receives confirmation and invoice');
    
    // Get the quote's public URL (if available)
    if (quote.url) {
      console.log('\n🔗 Direct Quote Link:');
      console.log(quote.url);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the setup guide
setupPaymentFlow();