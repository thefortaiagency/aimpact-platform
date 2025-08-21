const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function getQuoteGuide() {
  try {
    console.log('📊 TOLEDO TOOL & DIE - FINAL QUOTE GUIDE\n');
    console.log('=========================================\n');
    
    const quoteId = 'qt_1RyOKdQe1Z2kDcIZtg2K6onA';
    
    // Get the quote details
    const quote = await stripe.quotes.retrieve(quoteId);
    
    console.log('✅ YOUR FINAL QUOTE DETAILS:');
    console.log('----------------------------');
    console.log('Quote ID:', quote.id);
    console.log('Customer:', quote.customer);
    console.log('Status:', quote.status);
    console.log('Total Amount:', `$${(quote.amount_total / 100).toLocaleString()}`);
    console.log('Expires:', new Date(quote.expires_at * 1000).toLocaleDateString());
    
    console.log('\n📧 HOW TO SEND THIS QUOTE TO DAN HARPER:');
    console.log('=========================================');
    console.log('1. Go to Stripe Dashboard:');
    console.log(`   https://dashboard.stripe.com/quotes/${quoteId}`);
    console.log('');
    console.log('2. Click the "Send quote" button');
    console.log('');
    console.log('3. Customize the email message (optional):');
    console.log('   Subject: "Enterprise Production Analytics Platform Quote - Toledo Tool & Die"');
    console.log('   Message: "Dan, here\'s the custom quote we discussed for your 3 facilities."');
    console.log('');
    console.log('4. Click "Send"');
    
    console.log('\n👁️ WHAT DAN HARPER WILL SEE:');
    console.log('==============================');
    console.log('• Professional Stripe-hosted quote page');
    console.log('• Your company branding (if logo uploaded)');
    console.log('• Complete line item breakdown');
    console.log('• Clear pricing structure');
    console.log('• "Accept and pay" button');
    console.log('• PDF download option');
    
    console.log('\n💳 PAYMENT FLOW WHEN ACCEPTED:');
    console.log('================================');
    console.log('When Dan clicks "Accept and pay":');
    console.log('');
    console.log('1. PAYMENT METHOD SELECTION:');
    console.log('   • ACH Bank Transfer (Recommended)');
    console.log('     - Only 0.8% fee (capped at $5)');
    console.log('     - Saves $1,400+ vs credit card');
    console.log('   • Credit Card (2.9% + 30¢)');
    console.log('   • Wire Transfer (no fees over $5,000)');
    console.log('');
    console.log('2. SETUP FEE COLLECTION ($52,500):');
    console.log('   • Option A: Full payment immediately');
    console.log('   • Option B: 50% now ($26,250), 50% on go-live');
    console.log('');
    console.log('3. MONTHLY SUBSCRIPTIONS ($6,000/month):');
    console.log('   • Starts on go-live date');
    console.log('   • Auto-charges monthly');
    console.log('   • Customer saves payment method');
    
    console.log('\n📋 SETTING UP 50/50 PAYMENT TERMS:');
    console.log('====================================');
    console.log('Since you want 50% upfront, 50% on completion:');
    console.log('');
    console.log('AFTER Dan accepts the quote:');
    console.log('1. Create manual invoice for $26,250 (50% deposit)');
    console.log('   https://dashboard.stripe.com/invoices/create');
    console.log('2. Set as "Due immediately"');
    console.log('3. Send deposit invoice');
    console.log('4. Create second invoice for $26,250 when ready to go live');
    console.log('5. Start monthly subscriptions after go-live');
    
    console.log('\n🔔 NOTIFICATIONS & TRACKING:');
    console.log('=============================');
    console.log('You\'ll receive notifications when:');
    console.log('• Quote is viewed');
    console.log('• Quote is accepted');
    console.log('• Payment is received');
    console.log('• Invoice is paid');
    console.log('');
    console.log('Track everything at:');
    console.log(`https://dashboard.stripe.com/quotes/${quoteId}`);
    
    console.log('\n🎯 QUICK ACTIONS:');
    console.log('==================');
    console.log(`1. SEND QUOTE NOW:`);
    console.log(`   https://dashboard.stripe.com/quotes/${quoteId}`);
    console.log('');
    console.log(`2. VIEW CUSTOMER:`);
    console.log(`   https://dashboard.stripe.com/customers/${quote.customer}`);
    console.log('');
    console.log('3. CREATE DEPOSIT INVOICE (after acceptance):');
    console.log('   https://dashboard.stripe.com/invoices/create');
    console.log('   Amount: $26,250');
    console.log('   Terms: Due immediately');
    
    console.log('\n📱 CLIENT PORTAL:');
    console.log('==================');
    console.log('Dan Harper can:');
    console.log('• View all quotes and invoices');
    console.log('• Download PDFs');
    console.log('• Update payment methods');
    console.log('• View payment history');
    console.log('• Access from email link');
    
    console.log('\n✅ CHECKLIST BEFORE SENDING:');
    console.log('==============================');
    console.log('[ ] Upload logo to Stripe (Settings > Branding)');
    console.log('[ ] Review quote one more time');
    console.log('[ ] Prepare follow-up email with timeline');
    console.log('[ ] Have project kickoff deck ready');
    console.log('[ ] Assign implementation team');
    
    console.log('\n💰 REVENUE BREAKDOWN:');
    console.log('=======================');
    console.log('First Year Revenue from Toledo:');
    console.log('• Setup Fees: $52,500');
    console.log('• Monthly Recurring: $72,000 ($6,000 x 12)');
    console.log('• Total First Year: $124,500');
    console.log('');
    console.log('Ongoing Annual: $72,000/year');
    
    // If quote has a public URL
    if (quote.url) {
      console.log('\n🔗 DIRECT QUOTE LINK:');
      console.log('======================');
      console.log(quote.url);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get the guide for the final quote
getQuoteGuide();