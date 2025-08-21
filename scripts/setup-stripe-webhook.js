const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

// Initialize Stripe with secret key from environment
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Error: STRIPE_SECRET_KEY not found in environment variables');
  console.log('Please add STRIPE_SECRET_KEY to your .env.local file');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function createWebhook() {
  try {
    // Create the webhook endpoint
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: 'https://impact.aimpactnexus.ai/api/webhooks/stripe',
      enabled_events: [
        'invoice.created',
        'invoice.finalized',
        'invoice.paid',
        'invoice.payment_failed',
        'invoice.sent',
        'customer.created',
        'customer.updated',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'charge.succeeded',
        'charge.failed'
      ],
      description: 'AImpact Platform - Quote and Invoice webhooks'
    });

    console.log('✅ Webhook endpoint created successfully!');
    console.log('Webhook ID:', webhookEndpoint.id);
    console.log('Webhook URL:', webhookEndpoint.url);
    console.log('\n🔐 IMPORTANT: Add this webhook secret to your environment variables:');
    console.log('STRIPE_WEBHOOK_SECRET=' + webhookEndpoint.secret);
    console.log('\nAdd this to:');
    console.log('1. Your .env.local file');
    console.log('2. Vercel environment variables');
    
    return webhookEndpoint;
  } catch (error) {
    console.error('Error creating webhook:', error.message);
    
    // If webhook already exists, try to list existing webhooks
    if (error.message.includes('already exists')) {
      console.log('\n📋 Listing existing webhooks...');
      const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
      
      const existingWebhook = webhooks.data.find(w => 
        w.url === 'https://impact.aimpactnexus.ai/api/webhooks/stripe'
      );
      
      if (existingWebhook) {
        console.log('\n✅ Found existing webhook:');
        console.log('Webhook ID:', existingWebhook.id);
        console.log('Webhook URL:', existingWebhook.url);
        console.log('Status:', existingWebhook.status);
        console.log('\n🔐 Webhook secret: (You\'ll need to retrieve this from Stripe Dashboard)');
        console.log('Go to: https://dashboard.stripe.com/webhooks/' + existingWebhook.id);
      }
    }
  }
}

// Run the setup
createWebhook();