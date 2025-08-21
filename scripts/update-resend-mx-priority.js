const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// GoDaddy API Configuration
const GODADDY_API_KEY = process.env.GODADDY_API_KEY;
const GODADDY_API_SECRET = process.env.GODADDY_API_SECRET;
const GODADDY_API_URL = 'https://api.godaddy.com/v1/domains';

// Domains to update
const domains = [
  'aimpactnexus.ai',
  'thefortaiagency.com',
  'thefortaiagency.ai'
];

// Configure axios with GoDaddy auth
const godaddyApi = axios.create({
  baseURL: GODADDY_API_URL,
  headers: {
    'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
    'Content-Type': 'application/json'
  }
});

async function updateMXPriority(domain) {
  try {
    console.log(`\n📧 Processing domain: ${domain}`);
    console.log('================================');
    
    // Get current DNS records
    const response = await godaddyApi.get(`/${domain}/records/MX`);
    const currentMXRecords = response.data;
    
    console.log(`Found ${currentMXRecords.length} MX records:`);
    currentMXRecords.forEach(record => {
      console.log(`  - ${record.data} (Priority: ${record.priority})`);
    });
    
    // Update Resend MX records to priority 500 (lower priority)
    const updatedRecords = currentMXRecords.map(record => {
      // Check if this is a Resend MX record
      if (record.data.includes('resend.io') || record.data.includes('resend.com')) {
        console.log(`  ⚠️ Updating Resend MX: ${record.data} from priority ${record.priority} to 500`);
        return {
          ...record,
          priority: 500  // Set to very low priority
        };
      }
      return record;
    });
    
    // Only update if changes were made
    const hasChanges = updatedRecords.some((record, index) => 
      record.priority !== currentMXRecords[index].priority
    );
    
    if (hasChanges) {
      // Update the MX records
      await godaddyApi.put(`/${domain}/records/MX`, updatedRecords);
      console.log('✅ MX records updated successfully!');
      
      // Verify the update
      const verifyResponse = await godaddyApi.get(`/${domain}/records/MX`);
      console.log('\n📋 Updated MX records:');
      verifyResponse.data.forEach(record => {
        const isResend = record.data.includes('resend');
        const marker = isResend ? ' ⚠️ (Resend - Low Priority)' : ' ✅ (Primary Mail)';
        console.log(`  - ${record.data} (Priority: ${record.priority})${marker}`);
      });
    } else {
      console.log('ℹ️ No Resend MX records found or already set to low priority');
    }
    
  } catch (error) {
    console.error(`❌ Error updating ${domain}:`, error.response?.data || error.message);
  }
}

async function updateAllDomains() {
  console.log('🔧 UPDATING RESEND MX RECORD PRIORITIES');
  console.log('========================================');
  console.log('This will set all Resend MX records to priority 500');
  console.log('to prevent accidental email routing to Resend.\n');
  
  // Check for API credentials
  if (!GODADDY_API_KEY || !GODADDY_API_SECRET) {
    console.error('❌ ERROR: GoDaddy API credentials not found!');
    console.log('\n📝 Please add to your .env.local file:');
    console.log('GODADDY_API_KEY=your_api_key_here');
    console.log('GODADDY_API_SECRET=your_api_secret_here\n');
    console.log('Get your API credentials from:');
    console.log('https://developer.godaddy.com/keys\n');
    return;
  }
  
  // Process each domain
  for (const domain of domains) {
    await updateMXPriority(domain);
  }
  
  console.log('\n========================================');
  console.log('✅ COMPLETE - MX Priority Update Finished');
  console.log('\n📌 RECOMMENDED CONFIGURATION:');
  console.log('1. Primary mail server: Priority 10-20');
  console.log('2. Backup mail server: Priority 30-50');
  console.log('3. Resend (transactional): Priority 500 (won\'t receive)');
  console.log('\n💡 BETTER SOLUTION:');
  console.log('Consider using a subdomain for Resend:');
  console.log('  - send.aimpactnexus.ai (for transactional emails)');
  console.log('  - Keep main domain for regular email');
}

// Alternative: Create subdomain configuration
async function setupResendSubdomain(domain, subdomain = 'send') {
  console.log(`\n🔧 Setting up ${subdomain}.${domain} for Resend...`);
  
  try {
    // Add CNAME record for subdomain
    const cnameRecord = {
      type: 'CNAME',
      name: subdomain,
      data: `${subdomain}.${domain}`,
      ttl: 3600
    };
    
    // Add SPF record for subdomain
    const spfRecord = {
      type: 'TXT',
      name: subdomain,
      data: 'v=spf1 include:spf.resend.com ~all',
      ttl: 3600
    };
    
    console.log(`✅ Subdomain ${subdomain}.${domain} ready for Resend`);
    console.log('  - Configure Resend to send from this subdomain');
    console.log('  - Main domain email remains unaffected');
    
  } catch (error) {
    console.error('❌ Error setting up subdomain:', error.message);
  }
}

// Run the update
updateAllDomains();

// Export for use in other scripts
module.exports = { updateMXPriority, setupResendSubdomain };