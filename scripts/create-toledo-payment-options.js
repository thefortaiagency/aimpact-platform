const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function createToledoPaymentOptions() {
  try {
    console.log('🔗 Creating payment options for Toledo Tool & Die...\n');
    
    // Create payment link for 50% deposit
    const depositPaymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Enterprise Analytics Platform - 50% Deposit',
              images: ['https://impact.aimpactnexus.ai/aimpact-logo.png'],
            },
            unit_amount: 2625000, // $26,250 (50% of $52,500)
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Thank you for your deposit! We will contact you within 24 hours to schedule implementation. The remaining 50% ($26,250) will be due upon go-live.',
        },
      },
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        customer: 'Toledo Tool & Die',
        type: '50_percent_deposit',
        quote_id: 'qt_1RyOKdQe1Z2kDcIZtg2K6onA',
        payment_terms: '50% deposit, 50% on go-live'
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
    
    // Create payment link for full setup fee
    const fullPaymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Enterprise Analytics Platform - Full Setup Payment',
              images: ['https://impact.aimpactnexus.ai/aimpact-logo.png'],
            },
            unit_amount: 5250000, // $52,500 full amount
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
      billing_address_collection: 'required',
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        customer: 'Toledo Tool & Die',
        type: 'full_setup_payment',
        quote_id: 'qt_1RyOKdQe1Z2kDcIZtg2K6onA',
        payment_terms: 'Full payment upfront'
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
    
    // Create payment link for remaining balance (second 50%)
    const balancePaymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Enterprise Analytics Platform - Final Balance',
              images: ['https://impact.aimpactnexus.ai/aimpact-logo.png'],
            },
            unit_amount: 2625000, // $26,250 (second 50%)
          },
          quantity: 1,
        },
      ],
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Thank you for completing your payment! Your platform is now fully paid and ready for go-live.',
        },
      },
      billing_address_collection: 'required',
      metadata: {
        customer: 'Toledo Tool & Die',
        type: 'final_balance_payment',
        quote_id: 'qt_1RyOKdQe1Z2kDcIZtg2K6onA',
        payment_terms: 'Final 50% balance'
      },
      payment_method_types: ['card', 'us_bank_account'],
    });
    
    // Monthly subscription link (unchanged)
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
    
    console.log('✅ All Payment Links Created Successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                 TOLEDO PAYMENT OPTIONS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('💰 SETUP FEE PAYMENT OPTIONS:\n');
    
    console.log('Option 1️⃣ - 50% DEPOSIT ($26,250):');
    console.log('   ' + depositPaymentLink.url);
    console.log('   • Pay half now, half on go-live');
    console.log('   • Recommended for cash flow\n');
    
    console.log('Option 2️⃣ - FULL PAYMENT ($52,500):');
    console.log('   ' + fullPaymentLink.url);
    console.log('   • Pay everything upfront');
    console.log('   • Single transaction\n');
    
    console.log('📅 AFTER GO-LIVE:\n');
    
    console.log('3️⃣ FINAL BALANCE ($26,250) - if 50% deposit chosen:');
    console.log('   ' + balancePaymentLink.url);
    console.log('   • Due upon go-live completion');
    console.log('   • Send this link when ready\n');
    
    console.log('4️⃣ MONTHLY SUBSCRIPTION ($6,000/month):');
    console.log('   ' + subscriptionLink.url);
    console.log('   • Starts after go-live');
    console.log('   • Auto-renews monthly\n');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('                    EMAIL TEMPLATES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📧 INITIAL QUOTE EMAIL:');
    console.log('----------------------------------------');
    console.log(`
Hi Dan,

Here are the payment options for the Toledo Tool & Die Enterprise Analytics Platform:

PAYMENT OPTIONS FOR SETUP ($52,500):

Option 1: 50% Deposit Now ($26,250)
${depositPaymentLink.url}

Option 2: Full Payment Now ($52,500)
${fullPaymentLink.url}

Both options accept credit card or ACH bank transfer (ACH recommended for lower fees).
No login required - just click and pay securely through Stripe.

If you choose the 50% deposit option, the remaining balance will be due upon go-live.

Monthly subscription ($6,000/month) will begin after implementation is complete.

Let me know which option works best for Toledo Tool & Die!

Best regards,
[Your Name]
    `);
    
    console.log('\n📧 GO-LIVE COMPLETION EMAIL (if 50% deposit):');
    console.log('----------------------------------------');
    console.log(`
Hi Dan,

Great news! Your Enterprise Analytics Platform implementation is complete and ready for go-live.

Final Balance Due: $26,250
${balancePaymentLink.url}

Monthly Subscription ($6,000/month):
${subscriptionLink.url}

Please complete the final payment to activate your platform. The monthly subscription can be activated once you're ready.

Congratulations on your new platform!

Best regards,
[Your Name]
    `);
    
    console.log('\n💡 PAYMENT LINK SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('50% Deposit:    $26,250');
    console.log('Full Payment:   $52,500');
    console.log('Final Balance:  $26,250');
    console.log('Monthly:        $6,000/mo');
    
    return {
      depositLink: depositPaymentLink.url,
      fullPaymentLink: fullPaymentLink.url,
      balanceLink: balancePaymentLink.url,
      subscriptionLink: subscriptionLink.url
    };
    
  } catch (error) {
    console.error('❌ Error creating payment links:', error.message);
  }
}

// Create all payment options
createToledoPaymentOptions();