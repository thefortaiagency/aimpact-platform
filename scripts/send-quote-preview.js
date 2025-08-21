const Stripe = require('stripe');
const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function sendQuotePreview() {
  try {
    console.log('📧 Preparing quote preview email...\n');
    
    const quoteId = 'qt_1RyOKdQe1Z2kDcIZtg2K6onA';
    
    // Get the quote details
    const quote = await stripe.quotes.retrieve(quoteId);
    
    // Get line items for the quote
    const lineItems = await stripe.quotes.listLineItems(quoteId, { limit: 100 });
    
    console.log('Quote retrieved:', quote.id);
    console.log('Status:', quote.status);
    console.log('Customer:', quote.customer);
    
    // Format the line items
    let lineItemsHTML = '';
    let setupTotal = 0;
    let monthlyTotal = 0;
    
    lineItems.data.forEach(item => {
      const amount = item.price.unit_amount / 100;
      const isRecurring = item.price.recurring !== null;
      
      if (amount > 0) {
        if (isRecurring) {
          monthlyTotal += amount * item.quantity;
          lineItemsHTML += `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description || item.price.product}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${amount.toLocaleString()}/month</td>
            </tr>
          `;
        } else {
          setupTotal += amount * item.quantity;
          lineItemsHTML += `
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description || item.price.product}</td>
              <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${amount.toLocaleString()}</td>
            </tr>
          `;
        }
      } else {
        // $0 items (included services)
        lineItemsHTML += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description || item.price.product}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #28a745;">INCLUDED</td>
          </tr>
        `;
      }
    });
    
    // Create email HTML
    const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    .container { max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
    .quote-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .total-row { font-weight: bold; font-size: 1.1em; background: #f8f9fa; }
    .pricing-note { background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196F3; }
    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Enterprise Production Analytics Platform</h1>
      <p style="margin: 0; opacity: 0.9;">Quote for Toledo Tool & Die Company, Inc.</p>
    </div>
    
    <div class="content">
      <div class="quote-info">
        <strong>Quote ID:</strong> ${quote.id}<br>
        <strong>Valid Until:</strong> ${new Date(quote.expires_at * 1000).toLocaleDateString()}<br>
        <strong>Payment Terms:</strong> NET 30
      </div>
      
      <h2>Quote Details</h2>
      
      <table>
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="padding: 10px; text-align: left;">Description</th>
            <th style="padding: 10px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${lineItemsHTML}
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td style="padding: 10px; border-top: 2px solid #333;">Setup Total</td>
            <td style="padding: 10px; border-top: 2px solid #333; text-align: right;">$${setupTotal.toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td style="padding: 10px;">Monthly Total</td>
            <td style="padding: 10px; text-align: right;">$${monthlyTotal.toLocaleString()}/month</td>
          </tr>
        </tfoot>
      </table>
      
      <div class="pricing-note">
        <strong>📊 PRICING STRUCTURE:</strong><br>
        • 1 Location: $2,500/month<br>
        • 2 Locations: $2,250/month per location<br>
        • 3 Locations: $2,000/month per location <strong>(YOUR RATE)</strong><br><br>
        You're receiving our best 3-location bundle pricing!
      </div>
      
      <h3>What Happens Next?</h3>
      <ol>
        <li>Click "Accept and pay" to approve the quote</li>
        <li>Choose your payment method (ACH recommended for lower fees)</li>
        <li>50% deposit invoice ($26,250) will be sent immediately</li>
        <li>Remaining 50% due upon go-live</li>
        <li>Monthly subscription begins after implementation</li>
      </ol>
      
      <center>
        <a href="https://dashboard.stripe.com/quotes/${quote.id}" class="button">View Quote in Stripe Dashboard</a>
      </center>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
      
      <p style="color: #666; font-size: 0.9em;">
        <strong>Note:</strong> This is a preview of your Stripe quote. The actual quote Dan Harper will receive will be hosted on Stripe's secure platform with your branding and payment collection capabilities.
      </p>
      
      <p style="color: #666; font-size: 0.9em;">
        <strong>To send the actual quote:</strong><br>
        1. Go to: <a href="https://dashboard.stripe.com/quotes/${quote.id}">https://dashboard.stripe.com/quotes/${quote.id}</a><br>
        2. Click "Send quote"<br>
        3. Dan will receive the official Stripe-hosted quote
      </p>
    </div>
  </div>
</body>
</html>
    `;
    
    // Set up Gmail transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
    
    // Send the email
    const info = await transporter.sendMail({
      from: `"The Fort AI Agency" <${process.env.GMAIL_USER}>`,
      to: 'aoberlin@thefortaiagency.ai',
      subject: 'Quote Preview - Toledo Tool & Die Enterprise Platform',
      html: emailHTML
    });
    
    console.log('✅ Quote preview email sent!');
    console.log('Message ID:', info.messageId);
    console.log('Sent to: aoberlin@thefortaiagency.ai');
    
    console.log('\n📋 Summary:');
    console.log('- Setup Total: $' + setupTotal.toLocaleString());
    console.log('- Monthly Total: $' + monthlyTotal.toLocaleString());
    console.log('- First Year Total: $' + (setupTotal + (monthlyTotal * 12)).toLocaleString());
    
    console.log('\n🎯 To send the actual quote to Dan Harper:');
    console.log(`Go to: https://dashboard.stripe.com/quotes/${quote.id}`);
    console.log('Click "Send quote" button');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('nodemailer')) {
      console.log('\n💡 Alternative: View the quote directly in Stripe:');
      console.log('https://dashboard.stripe.com/quotes/qt_1RyOKdQe1Z2kDcIZtg2K6onA');
      console.log('\nYou can download the PDF from there and email it manually.');
    }
  }
}

// Send the preview
sendQuotePreview();