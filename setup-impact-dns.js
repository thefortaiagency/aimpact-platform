#!/usr/bin/env node

const https = require('https');

// GoDaddy API credentials
const GODADDY_API_KEY = process.env.GODADDY_API_KEY;
const GODADDY_API_SECRET = process.env.GODADDY_API_SECRET;
const DOMAIN = 'aimpactnexus.ai';
const SUBDOMAIN = 'impact';
const VERCEL_IP = '76.76.21.21';

if (!GODADDY_API_KEY || !GODADDY_API_SECRET) {
  console.error('Error: GODADDY_API_KEY and GODADDY_API_SECRET environment variables are required');
  process.exit(1);
}

// Function to make GoDaddy API request
function makeGoDaddyRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.godaddy.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(responseData ? JSON.parse(responseData) : {});
          } catch (e) {
            resolve(responseData);
          }
        } else {
          reject(new Error(`GoDaddy API error: ${res.statusCode} - ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function setupDNS() {
  try {
    console.log(`Setting up DNS for ${SUBDOMAIN}.${DOMAIN}...`);
    
    // First, check existing records
    console.log('Checking existing DNS records...');
    const existingRecords = await makeGoDaddyRequest('GET', `/v1/domains/${DOMAIN}/records/A/${SUBDOMAIN}`);
    
    if (Array.isArray(existingRecords) && existingRecords.length > 0) {
      console.log(`Found existing A record for ${SUBDOMAIN}.${DOMAIN}:`, existingRecords[0]);
      
      // Update existing record
      console.log(`Updating A record to point to Vercel IP: ${VERCEL_IP}...`);
      await makeGoDaddyRequest('PUT', `/v1/domains/${DOMAIN}/records/A/${SUBDOMAIN}`, [
        {
          data: VERCEL_IP,
          ttl: 600
        }
      ]);
      console.log('✅ DNS record updated successfully!');
    } else {
      // Create new record
      console.log(`Creating new A record for ${SUBDOMAIN}.${DOMAIN} pointing to ${VERCEL_IP}...`);
      await makeGoDaddyRequest('PATCH', `/v1/domains/${DOMAIN}/records`, [
        {
          type: 'A',
          name: SUBDOMAIN,
          data: VERCEL_IP,
          ttl: 600
        }
      ]);
      console.log('✅ DNS record created successfully!');
    }
    
    console.log('\n📌 DNS Configuration Complete!');
    console.log(`   ${SUBDOMAIN}.${DOMAIN} → ${VERCEL_IP}`);
    console.log('\n⏱️  DNS propagation may take up to 48 hours, but typically completes within minutes.');
    console.log('   You can check the status at: https://vercel.com/the-fort-ai-agency/aimpact-platform/settings/domains');
    
  } catch (error) {
    console.error('❌ Error setting up DNS:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupDNS();