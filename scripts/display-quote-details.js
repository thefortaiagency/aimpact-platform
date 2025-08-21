const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function displayQuoteDetails() {
  try {
    console.log('📋 TOLEDO TOOL & DIE QUOTE DETAILS\n');
    console.log('=====================================\n');
    
    const quoteId = 'qt_1RyOKdQe1Z2kDcIZtg2K6onA';
    
    // Get the quote and line items
    const quote = await stripe.quotes.retrieve(quoteId);
    const lineItems = await stripe.quotes.listLineItems(quoteId, { limit: 100 });
    
    console.log('QUOTE INFORMATION:');
    console.log('------------------');
    console.log('Quote ID:', quote.id);
    console.log('Status:', quote.status.toUpperCase());
    console.log('Valid Until:', new Date(quote.expires_at * 1000).toLocaleDateString());
    console.log('Payment Terms: NET 30');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                    LINE ITEMS BREAKDOWN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    let setupItems = [];
    let monthlyItems = [];
    let includedItems = [];
    let setupTotal = 0;
    let monthlyTotal = 0;
    
    // Categorize line items
    lineItems.data.forEach(item => {
      const amount = item.price.unit_amount / 100;
      const isRecurring = item.price.recurring !== null;
      const quantity = item.quantity;
      
      const itemDetail = {
        description: item.description || 'Product',
        amount: amount,
        quantity: quantity,
        total: amount * quantity
      };
      
      if (amount > 0) {
        if (isRecurring) {
          monthlyItems.push(itemDetail);
          monthlyTotal += itemDetail.total;
        } else {
          setupItems.push(itemDetail);
          setupTotal += itemDetail.total;
        }
      } else {
        includedItems.push({
          description: item.description || 'Service',
          status: 'INCLUDED'
        });
      }
    });
    
    // Display Setup Fees
    if (setupItems.length > 0) {
      console.log('SETUP & INSTALLATION FEES:');
      console.log('─────────────────────────');
      setupItems.forEach(item => {
        console.log(`• ${item.description}`);
        console.log(`  Amount: $${item.amount.toLocaleString()}`);
      });
      console.log(`\n  SETUP TOTAL: $${setupTotal.toLocaleString()}`);
    }
    
    // Display Monthly Subscriptions
    if (monthlyItems.length > 0) {
      console.log('\n\nMONTHLY SUBSCRIPTIONS:');
      console.log('──────────────────────');
      monthlyItems.forEach(item => {
        console.log(`• ${item.description}`);
        console.log(`  Monthly: $${item.amount.toLocaleString()}/month`);
      });
      console.log(`\n  MONTHLY TOTAL: $${monthlyTotal.toLocaleString()}/month`);
    }
    
    // Display Included Services
    if (includedItems.length > 0) {
      console.log('\n\nINCLUDED SERVICES (No Additional Cost):');
      console.log('────────────────────────────────────────');
      includedItems.forEach(item => {
        console.log(`✓ ${item.description}`);
      });
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                        PRICING MEMO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📊 TIERED PRICING STRUCTURE:');
    console.log('────────────────────────────');
    console.log('• 1 Location:  $2,500/month');
    console.log('• 2 Locations: $2,250/month per location');
    console.log('• 3 Locations: $2,000/month per location ← TOLEDO\'S RATE');
    console.log('\nToledo receives the best bundle pricing for committing to all 3 locations!');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                      FINANCIAL SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const firstYear = setupTotal + (monthlyTotal * 12);
    
    console.log('💰 TOTALS:');
    console.log('──────────');
    console.log(`One-Time Setup:     $${setupTotal.toLocaleString()}`);
    console.log(`Monthly Recurring:  $${monthlyTotal.toLocaleString()}/month`);
    console.log(`Annual Recurring:   $${(monthlyTotal * 12).toLocaleString()}/year`);
    console.log(`\nFIRST YEAR TOTAL:   $${firstYear.toLocaleString()}`);
    
    console.log('\n💳 PAYMENT SCHEDULE:');
    console.log('────────────────────');
    console.log('• 50% Deposit:      $26,250 (upon signing)');
    console.log('• 50% Balance:      $26,250 (upon go-live)');
    console.log('• Monthly starts:   After go-live completion');
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                     HOW TO SEND THIS QUOTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📧 SEND TO DAN HARPER:');
    console.log(`1. Go to: https://dashboard.stripe.com/quotes/${quoteId}`);
    console.log('2. Click "Send quote" button');
    console.log('3. Dan receives professional Stripe-hosted quote');
    console.log('4. He can accept and pay online immediately');
    
    console.log('\n📄 DOWNLOAD PDF:');
    console.log('1. Open quote in Stripe Dashboard');
    console.log('2. Click "Download PDF" button');
    console.log('3. Email PDF to aoberlin@thefortaiagency.ai for your records');
    
    console.log('\n🔗 DIRECT LINKS:');
    console.log(`• View Quote: https://dashboard.stripe.com/quotes/${quoteId}`);
    console.log(`• Customer: https://dashboard.stripe.com/customers/${quote.customer}`);
    
    // Get quote description if available
    if (quote.description) {
      console.log('\n📝 QUOTE DESCRIPTION:');
      console.log('─────────────────────');
      console.log(quote.description);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Display the quote details
displayQuoteDetails();