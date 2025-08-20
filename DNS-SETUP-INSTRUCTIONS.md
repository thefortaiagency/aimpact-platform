# DNS Setup Instructions for impact.aimpactnexus.ai

## Quick Setup (Manual)

You need to add the following DNS record in your GoDaddy account:

### Step 1: Log into GoDaddy
1. Go to https://godaddy.com
2. Sign in to your account
3. Navigate to "My Products" > "Domains"
4. Find `aimpactnexus.ai` and click "DNS"

### Step 2: Add the A Record
Add the following record:

- **Type**: A
- **Name**: impact
- **Value**: 76.76.21.21
- **TTL**: 600 (or 10 minutes)

### Step 3: Save Changes
Click "Save" to apply the DNS changes.

## Verification
After adding the record, it may take up to 48 hours for DNS to propagate (usually much faster, within minutes).

You can verify the setup by:
1. Visiting https://vercel.com/the-fort-ai-agency/aimpact-platform/settings/domains
2. The domain should show as "Valid Configuration" once DNS propagates
3. Or run: `nslookup impact.aimpactnexus.ai` to verify it resolves to 76.76.21.21

## Alternative: Automated Setup

If you have GoDaddy API credentials, you can run:

```bash
export GODADDY_API_KEY="your-key-here"
export GODADDY_API_SECRET="your-secret-here"
node setup-impact-dns.js
```

## Your Domain Will Be Available At:
**https://impact.aimpactnexus.ai**

---

Current Status:
✅ Domain added to Vercel project
⏳ Waiting for DNS configuration
⏳ Waiting for SSL certificate (automatic after DNS)