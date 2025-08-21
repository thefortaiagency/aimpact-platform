const Stripe = require('stripe');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function addAITuningProduct() {
  try {
    console.log('🤖 Creating AI Tuning monthly service product...\n');
    
    // Create AI Tuning product
    const aiTuningProduct = await stripe.products.create({
      name: 'AI Model Tuning & Optimization Services',
      description: 'Monthly AI model optimization, custom algorithm development, predictive analytics improvements, and machine learning enhancements'
    });
    
    const aiTuningPrice = await stripe.prices.create({
      product: aiTuningProduct.id,
      unit_amount: 150000, // $1,500/month
      currency: 'usd',
      recurring: { interval: 'month' }
    });
    
    console.log('✅ AI Tuning Product Created!');
    console.log('-----------------------------------');
    console.log('Product ID:', aiTuningProduct.id);
    console.log('Product Name:', aiTuningProduct.name);
    console.log('Price ID:', aiTuningPrice.id);
    console.log('Monthly Price: $1,500');
    console.log('\n📝 AI Tuning Services Include:');
    console.log('• Monthly model performance optimization');
    console.log('• Custom predictive analytics algorithms');
    console.log('• Anomaly detection tuning');
    console.log('• Production forecasting improvements');
    console.log('• Scrap prediction models');
    console.log('• Machine efficiency optimization');
    console.log('• Custom KPI threshold adjustments');
    console.log('• Quarterly AI strategy consultations');
    
    console.log('\n📊 To add to existing quote:');
    console.log('1. Go to: https://dashboard.stripe.com/quotes/qt_1RyNtzQe1Z2kDcIZsrK7J9gQ');
    console.log('2. Click "Edit"');
    console.log('3. Add line item with Price ID:', aiTuningPrice.id);
    console.log('4. Save and resend the updated quote');
    
    console.log('\n💰 Updated Monthly Total:');
    console.log('  Location 1: $2,500/month');
    console.log('  Location 2: $2,250/month');
    console.log('  Location 3: $2,000/month');
    console.log('  AI Tuning:  $1,500/month');
    console.log('  ----------------------------');
    console.log('  New Total:  $8,250/month');
    
    return { product: aiTuningProduct, price: aiTuningPrice };
  } catch (error) {
    console.error('❌ Error creating AI tuning product:', error.message);
  }
}

// Create the AI tuning product
addAITuningProduct();