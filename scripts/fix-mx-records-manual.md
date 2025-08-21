# Fix MX Records for Resend - Manual Instructions

## 🎯 Goal
Set Resend MX records to priority 500 (very low) so regular email goes to your primary mail server.

## 📋 Domains to Update
- aimpactnexus.ai
- thefortaiagency.com
- thefortaiagency.ai

## 🔧 Manual Steps via GoDaddy Dashboard

### For Each Domain:

1. **Login to GoDaddy**: https://dcc.godaddy.com

2. **Navigate to DNS**:
   - My Products → Domains
   - Click on the domain
   - Click "DNS" or "Manage DNS"

3. **Find MX Records**:
   - Look for records with Type = MX
   - Identify any that point to Resend:
     - Usually ends with `.resend.io` or `.resend.com`
     - Example: `feedback-smtp.us-east-1.amazonses.com` (if using Resend's AWS)

4. **Update Resend MX Priority**:
   - Click the pencil icon to edit
   - Change Priority from (usually 10) to **500**
   - Keep your main mail server at Priority 10 or 20
   - Save changes

### Correct Configuration Should Look Like:

```
Type | Name | Value                        | Priority | TTL
-----|------|------------------------------|----------|-----
MX   | @    | mail.google.com             | 10       | 1 Hour  ← Your primary email
MX   | @    | alt1.mail.google.com        | 20       | 1 Hour  ← Backup
MX   | @    | feedback-smtp.resend.io     | 500      | 1 Hour  ← Resend (won't receive)
```

## 🚀 Better Solution: Use Subdomain for Resend

### Create subdomain `send.yourdomain.com`:

1. **Add A Record**:
   ```
   Type: A
   Name: send
   Value: [Resend's IP if provided]
   TTL: 1 Hour
   ```

2. **Add SPF for Subdomain**:
   ```
   Type: TXT
   Name: send
   Value: v=spf1 include:spf.resend.com ~all
   TTL: 1 Hour
   ```

3. **Add DKIM Records** (from Resend dashboard):
   ```
   Type: TXT
   Name: resend._domainkey.send
   Value: [Resend will provide this]
   TTL: 1 Hour
   ```

4. **Configure Resend**:
   - Use `send.yourdomain.com` in Resend
   - Send emails from `noreply@send.yourdomain.com`
   - Your main email remains untouched

## 📊 Priority Guidelines

| Service | Priority | Purpose |
|---------|----------|---------|
| Primary Mail Server (Google/Microsoft) | 10 | Main email delivery |
| Backup Mail Server | 20-30 | Failover |
| Tertiary Backup | 40-50 | Additional failover |
| Resend/Transactional | 500+ | Never receives (send only) |

## ⚠️ Important Notes

1. **MX Priority**: Lower number = higher priority
2. **Email will go to**: The server with the LOWEST priority number
3. **Setting to 500**: Ensures Resend never receives email
4. **SPF Records**: Can include multiple services:
   ```
   v=spf1 include:_spf.google.com include:spf.resend.com ~all
   ```

## 🔍 Verify Your Changes

### Check MX Records:
```bash
# Terminal command to verify
nslookup -type=MX aimpactnexus.ai

# Should show:
# mail.google.com     priority = 10
# resend.io          priority = 500
```

### Test Email Delivery:
1. Send test email to your domain
2. Should arrive in Google/Microsoft inbox
3. Should NOT go to Resend

## 💡 Recommended Setup

```
Main Domain (aimpactnexus.ai):
- Regular email: you@aimpactnexus.ai → Google Workspace
- MX Priority 10-20

Subdomain (send.aimpactnexus.ai):
- Transactional: noreply@send.aimpactnexus.ai → Resend
- No MX records needed (send only)
```

## 🛠️ If Using the Script

Add to `.env.local`:
```
GODADDY_API_KEY=your_key_here
GODADDY_API_SECRET=your_secret_here
```

Get API credentials from: https://developer.godaddy.com/keys

Then run:
```bash
node scripts/update-resend-mx-priority.js
```

---

*This prevents Resend from interfering with your regular email while still allowing transactional email sending.*