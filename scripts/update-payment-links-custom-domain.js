const fs = require('fs');
const path = require('path');

// Map the Stripe payment link IDs to use with custom domain
const paymentLinks = {
  deposit: 'fZu6oJ7WMdjW4Al6vWasg05',
  fullPayment: 'dRmfZj7WMeo05Ep07yasg06',
  finalBalance: 'aFa7sN7WM7ZC2sdbQgasg07',
  monthlySubscription: '3cI8wR5OE93G0k55rSasg08'
};

// Custom domain base URL
const customDomain = 'https://pay.aimpactnexus.ai';

function generateCustomLinks() {
  console.log('🔗 TOLEDO PAYMENT LINKS WITH CUSTOM DOMAIN\n');
  console.log('============================================\n');
  
  console.log('Your custom payment domain is configured: pay.aimpactnexus.ai');
  console.log('This provides a professional, branded payment experience!\n');
  
  console.log('📋 UPDATED PAYMENT LINKS:\n');
  
  // Generate custom domain links
  const customLinks = {
    deposit: `${customDomain}/${paymentLinks.deposit}`,
    fullPayment: `${customDomain}/${paymentLinks.fullPayment}`,
    finalBalance: `${customDomain}/${paymentLinks.finalBalance}`,
    monthlySubscription: `${customDomain}/${paymentLinks.monthlySubscription}`
  };
  
  console.log('1️⃣ 50% DEPOSIT ($26,250):');
  console.log(`   ${customLinks.deposit}`);
  console.log('   ✓ Professional branded URL');
  console.log('   ✓ No "stripe.com" in the link\n');
  
  console.log('2️⃣ FULL PAYMENT ($52,500):');
  console.log(`   ${customLinks.fullPayment}\n`);
  
  console.log('3️⃣ FINAL BALANCE ($26,250):');
  console.log(`   ${customLinks.finalBalance}\n`);
  
  console.log('4️⃣ MONTHLY SUBSCRIPTION ($6,000/mo):');
  console.log(`   ${customLinks.monthlySubscription}\n`);
  
  console.log('============================================\n');
  console.log('📧 UPDATED EMAIL TEMPLATE:\n');
  console.log(`
Hi Dan,

Here are the payment options for Toledo Tool & Die:

PAYMENT OPTIONS:
50% Deposit Now ($26,250): ${customLinks.deposit}
Full Payment ($52,500): ${customLinks.fullPayment}

All payments are processed securely through our payment portal at pay.aimpactnexus.ai

Best regards,
[Your Name]
  `);
  
  console.log('\n🎯 BENEFITS OF CUSTOM DOMAIN:');
  console.log('• Builds trust with professional branding');
  console.log('• Removes "stripe.com" from URLs');
  console.log('• Consistent brand experience');
  console.log('• Easier to remember and share');
  console.log('• Shows you\'re an established business\n');
  
  // Update the quote page file
  console.log('📝 UPDATING QUOTE PAGE WITH CUSTOM DOMAIN...\n');
  
  const quotePath = path.join(__dirname, '../app/quotes/[id]/page.tsx');
  
  try {
    let content = fs.readFileSync(quotePath, 'utf8');
    
    // Replace old Stripe URLs with custom domain
    content = content.replace(
      'https://buy.stripe.com/fZu6oJ7WMdjW4Al6vWasg05',
      customLinks.deposit
    );
    content = content.replace(
      'https://buy.stripe.com/dRmfZj7WMeo05Ep07yasg06',
      customLinks.fullPayment
    );
    
    fs.writeFileSync(quotePath, content);
    console.log('✅ Quote page updated with custom payment domain!');
    console.log('   File: app/quotes/[id]/page.tsx\n');
    
  } catch (error) {
    console.log('ℹ️ To update the quote page manually:');
    console.log('   Edit: app/quotes/[id]/page.tsx');
    console.log(`   Replace Stripe URLs with: ${customDomain}/[payment-link-id]\n`);
  }
  
  console.log('🚀 NEXT STEPS:');
  console.log('1. Verify custom domain is working: ' + customLinks.deposit);
  console.log('2. Test a payment to ensure everything flows correctly');
  console.log('3. Update any other payment links in your system');
  console.log('4. Share the professional links with Toledo!\n');
  
  return customLinks;
}

// Generate and display the custom links
const links = generateCustomLinks();

// Export for use in other scripts
module.exports = links;