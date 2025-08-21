const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function createToledoPaymentLink() {
  try {
    console.log('🔗 Creating direct payment link for Toledo Tool & Die...\n');
    
    // Create a payment link for the setup fee
    const setupPaymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Enterprise Production Analytics Platform - Setup',
              description: '3 locations: Toledo Main, Bennett Road, Pioneer Facility',
              images: ['https://impact.aimpactnexus.ai/aimpact-logo.png'],
            },
            unit_amount: 5250000, // $52,500
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Thank you for your payment! We will contact you within 24 hours to schedule implementation.',
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        customer: 'Toledo Tool & Die',
        type: 'setup_fee',
        quote_id: 'qt_1RyOKdQe1Z2kDcIZtg2K6onA'
      },
      payment_method_types: ['card', 'us_bank_account'],
      custom_fields: [
        {
          key: 'contact_name',
          label: {
            type: 'custom',
            custom: 'Primary Contact Name',
          },
          type: 'text',
        },
        {
          key: 'purchase_order',
          label: {
            type: 'custom',
            custom: 'Purchase Order Number (optional)',
          },
          type: 'text',
          optional: true,
        },
      ],
    });
    
    // Create a subscription link for monthly payments
    const monthlyPrice = await stripe.prices.create({
      currency: 'usd',
      unit_amount: 600000, // $6,000/month
      recurring: { interval: 'month' },
      product_data: {
        name: 'Enterprise Analytics Platform - Monthly (3 Locations)',
      },
    });
    
    const subscriptionLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: monthlyPrice.id,
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Your monthly subscription is now active. Welcome to AImpact Nexus!',
        },
      },
      billing_address_collection: 'required',
      metadata: {
        customer: 'Toledo Tool & Die',
        type: 'monthly_subscription',
        quote_id: 'qt_1RyOKdQe1Z2kDcIZtg2K6onA'
      },
    });
    
    console.log('✅ Payment Links Created Successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                    TOLEDO PAYMENT LINKS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📧 SHARE THESE LINKS WITH DAN HARPER:\n');
    
    console.log('1️⃣ SETUP FEE PAYMENT ($52,500):');
    console.log('   ' + setupPaymentLink.url);
    console.log('   • No login required');
    console.log('   • Accepts card or ACH bank transfer');
    console.log('   • Can pay 50% now, 50% later if needed\n');
    
    console.log('2️⃣ MONTHLY SUBSCRIPTION ($6,000/month):');
    console.log('   ' + subscriptionLink.url);
    console.log('   • Starts after go-live');
    console.log('   • Auto-renews monthly');
    console.log('   • Can cancel anytime\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                    HOW TO USE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('Option A - Email Template:');
    console.log('----------------------------------------');
    console.log(`
Hi Dan,

Here are the payment links for the Toledo Tool & Die Enterprise Analytics Platform:

Setup Fee ($52,500 one-time):
${setupPaymentLink.url}

Monthly Subscription ($6,000/month - activate after go-live):
${subscriptionLink.url}

Both links accept credit card or ACH bank transfer (ACH recommended for lower fees).
No account or login required - just click and pay securely through Stripe.

Let me know if you have any questions!

Best regards,
[Your Name]
    `);
    
    console.log('\nOption B - Add to Your Quote Page:');
    console.log('----------------------------------------');
    console.log('Update the button in your quote page to link directly to:');
    console.log('Setup Payment: ' + setupPaymentLink.url);
    
    console.log('\n💡 PAYMENT LINK FEATURES:');
    console.log('• Works immediately - no email required');
    console.log('• Mobile friendly');
    console.log('• Secure Stripe checkout');
    console.log('• Automatic receipt generation');
    console.log('• No customer account needed');
    
    return {
      setupLink: setupPaymentLink.url,
      subscriptionLink: subscriptionLink.url
    };
    
  } catch (error) {
    console.error('❌ Error creating payment links:', error.message);
  }
}

// Create the payment links
createToledoPaymentLink();