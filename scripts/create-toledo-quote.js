const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function createToledoQuote() {
  try {
    console.log('Creating quote for Toledo Tool & Die...\n');
    
    // First, we need to get a session token (you'll need to be logged in)
    // For now, we'll create it directly via the API
    
    const quoteData = {
      clientName: 'Toledo Tool & Die Company, Inc.',
      clientEmail: 'daniel.harper@toledotool.com',
      projectType: 'Enterprise Production Analytics Platform',
      projectDescription: `Complete enterprise production analytics platform for 3 manufacturing facilities:
      
• Location 1: Toledo Main (Alexis Road) - Primary manufacturing and headquarters
• Location 2: Toledo Bennett Road - 105,000 sq ft advanced manufacturing
• Location 3: Pioneer Facility - Former Arcelor Mittal building (80+ employees)

Key Features:
- Real-time production hit tracking across all machines and shifts
- YTD running totals by machine, shift, and facility
- Multi-shift management with accurate 8-hour calculations
- Scrap analysis with top 10 parts by cost
- PDCA project management for continuous improvement
- Paylocity time management system integration
- Automated data imports from production systems
- Custom KPI dashboards tailored to Toledo Tool & Die metrics`,
      budget: '$52,500 setup + $6,000/month',
      timeline: '6 weeks - 2 weeks per location',
      additionalNotes: `ROI Timeline: 6-8 months to full payback
Estimated Annual Savings: $225,000+
99.9% uptime SLA with 4-hour response time for urgent issues
Includes vCIO consultation and dedicated account management`
    };

    const response = await fetch('https://impact.aimpactnexus.ai/api/admin/quotes/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: This would normally require authentication
        // You'll need to run this while logged into the platform
      },
      body: JSON.stringify(quoteData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Quote created successfully!\n');
      console.log('Quote ID:', result.quoteId);
      console.log('Client:', result.quote.clientName);
      console.log('Project:', result.quote.projectName);
      console.log('Amount Range: $' + result.quote.amountMin.toLocaleString() + ' - $' + result.quote.amountMax.toLocaleString());
      
      if (result.stripeQuoteId) {
        console.log('\n🎯 Stripe Quote Created:');
        console.log('Stripe Quote ID:', result.stripeQuoteId);
        console.log('View in Stripe Dashboard:', `https://dashboard.stripe.com/quotes/${result.stripeQuoteId}`);
      }
      
      console.log('\n📧 To send this quote:');
      console.log('1. Log into the platform at https://impact.aimpactnexus.ai');
      console.log('2. Go to the Quotes section');
      console.log('3. Find this quote and click "Send"');
      console.log('4. The client will receive a professional Stripe-hosted quote');
      
      return result;
    } else {
      const error = await response.text();
      console.error('❌ Failed to create quote:', error);
      console.log('\n💡 Alternative: Create directly via Stripe Dashboard');
      console.log('1. Go to https://dashboard.stripe.com/quotes');
      console.log('2. Click "Create quote"');
      console.log('3. Use the information from TOLEDO-QUOTE-INFORMATION.md');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\n📝 Quote Details for Manual Creation:');
    console.log('-----------------------------------');
    console.log('Client: Toledo Tool & Die Company, Inc.');
    console.log('Contact: Dan Harper (daniel.harper@toledotool.com)');
    console.log('Setup Fee: $52,500 (one-time for all 3 locations)');
    console.log('Monthly: $6,000 (enterprise bundle for 3 locations)');
    console.log('Total First Year: $124,500');
    console.log('Implementation: 6 weeks');
  }
}

// Create the quote
createToledoQuote();