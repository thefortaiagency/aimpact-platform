// Test different URL formats for Stripe custom domain payment links

const paymentLinkId = 'plink_1RyOdUQe1Z2kDcIZQ5XoKvJH'; // Example format

console.log('🔍 TESTING STRIPE CUSTOM DOMAIN URL FORMATS\n');
console.log('============================================\n');

console.log('If your custom domain is verified, try these URL formats:\n');

// Option 1: Direct payment link format
console.log('Option 1 - Direct Payment Link Format:');
console.log('https://pay.aimpactnexus.ai/buy/fZu6oJ7WMdjW4Al6vWasg05');
console.log('https://pay.aimpactnexus.ai/buy/dRmfZj7WMeo05Ep07yasg06\n');

// Option 2: With /c/ prefix (checkout)
console.log('Option 2 - Checkout Format:');
console.log('https://pay.aimpactnexus.ai/c/fZu6oJ7WMdjW4Al6vWasg05');
console.log('https://pay.aimpactnexus.ai/c/dRmfZj7WMeo05Ep07yasg06\n');

// Option 3: Payment link ID format
console.log('Option 3 - Payment Link ID Format:');
console.log('https://pay.aimpactnexus.ai/pl/[payment_link_id]');
console.log('(You need to get the actual payment link IDs from Stripe Dashboard)\n');

// Option 4: Full path format
console.log('Option 4 - Full Path Format:');
console.log('https://pay.aimpactnexus.ai/pay/fZu6oJ7WMdjW4Al6vWasg05');
console.log('https://pay.aimpactnexus.ai/pay/dRmfZj7WMeo05Ep07yasg06\n');

console.log('============================================\n');
console.log('🔧 TO FIND THE CORRECT FORMAT:\n');

console.log('1. Go to Stripe Dashboard > Payment Links');
console.log('2. Click on one of your payment links');
console.log('3. Look for "Share link" or "Get link"');
console.log('4. It should show the custom domain URL format\n');

console.log('OR\n');

console.log('1. In Stripe Dashboard, go to Settings > Payment Links > Domains');
console.log('2. Click on pay.aimpactnexus.ai');
console.log('3. It should show example URLs with the correct format\n');

console.log('============================================\n');
console.log('📝 COMMON ISSUES:\n');

console.log('• The URL path after the domain might be different');
console.log('• Payment links created BEFORE domain setup might not work');
console.log('• You may need to recreate payment links after domain setup');
console.log('• Some features require specific Stripe plan levels\n');

console.log('🎯 QUICK TEST:\n');
console.log('Try these URLs in your browser:\n');
console.log('1. https://pay.aimpactnexus.ai');
console.log('   (Should show Stripe page or redirect)\n');
console.log('2. https://pay.aimpactnexus.ai/buy/test');
console.log('   (Should show error but confirm domain works)\n');