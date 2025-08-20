-- Email Campaign Database Schema
-- Comprehensive email marketing system with tracking and compliance

-- 1. Email Lists (groups of contacts)
CREATE TABLE email_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Email Contacts with Opt-in/out Management
CREATE TABLE email_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company VARCHAR(255),
  phone VARCHAR(50),
  
  -- Opt-in/out management
  is_subscribed BOOLEAN DEFAULT true,
  opted_in_at TIMESTAMP WITH TIME ZONE,
  opted_out_at TIMESTAMP WITH TIME ZONE,
  opt_in_method VARCHAR(50), -- 'import', 'signup', 'manual', 'api'
  opt_out_reason TEXT,
  
  -- Compliance fields
  consent_given BOOLEAN DEFAULT false,
  consent_date TIMESTAMP WITH TIME ZONE,
  consent_ip VARCHAR(45),
  gdpr_consent BOOLEAN DEFAULT false,
  
  -- Engagement tracking
  last_engaged_at TIMESTAMP WITH TIME ZONE,
  engagement_score INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  is_bounced BOOLEAN DEFAULT false,
  
  -- Custom fields as JSON
  custom_fields JSONB DEFAULT '{}',
  tags TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_email_subscribed (email, is_subscribed),
  INDEX idx_engagement (last_engaged_at, engagement_score)
);

-- 3. List Memberships (many-to-many)
CREATE TABLE list_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES email_lists(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES email_contacts(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'unsubscribed', 'bounced'
  
  UNIQUE(list_id, contact_id)
);

-- 4. Email Campaigns
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  preview_text VARCHAR(200),
  from_name VARCHAR(100) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  reply_to VARCHAR(255),
  
  -- Content
  html_content TEXT,
  plain_text_content TEXT,
  template_id UUID,
  
  -- Targeting
  list_ids UUID[],
  segment_rules JSONB, -- Dynamic segmentation rules
  
  -- Scheduling
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Stats
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  unsubscribed_count INTEGER DEFAULT 0,
  bounced_count INTEGER DEFAULT 0,
  complained_count INTEGER DEFAULT 0,
  
  -- Rates
  open_rate DECIMAL(5,2),
  click_rate DECIMAL(5,2),
  bounce_rate DECIMAL(5,2),
  unsubscribe_rate DECIMAL(5,2),
  
  -- A/B Testing
  is_ab_test BOOLEAN DEFAULT false,
  ab_test_config JSONB,
  winning_variant VARCHAR(10),
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_campaign_status (status, scheduled_at),
  INDEX idx_campaign_dates (sent_at, created_at)
);

-- 5. Campaign Recipients (individual sends)
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES email_contacts(id),
  email VARCHAR(255) NOT NULL,
  
  -- Send status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'bounced', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  bounced_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  
  -- Engagement tracking
  opened_count INTEGER DEFAULT 0,
  first_opened_at TIMESTAMP WITH TIME ZONE,
  last_opened_at TIMESTAMP WITH TIME ZONE,
  clicked_count INTEGER DEFAULT 0,
  first_clicked_at TIMESTAMP WITH TIME ZONE,
  last_clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Actions
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  complained_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  tracking_id VARCHAR(100) UNIQUE,
  message_id VARCHAR(255), -- Email service provider message ID
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_recipient_campaign (campaign_id, status),
  INDEX idx_recipient_tracking (tracking_id),
  INDEX idx_recipient_engagement (opened_count, clicked_count)
);

-- 6. Email Opens Tracking
CREATE TABLE email_opens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  client_type VARCHAR(100), -- 'gmail', 'outlook', 'apple-mail', etc.
  location JSONB, -- Geo-location data
  
  INDEX idx_opens_recipient (recipient_id, opened_at),
  INDEX idx_opens_campaign (campaign_id, opened_at)
);

-- 7. Email Clicks Tracking
CREATE TABLE email_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES campaign_recipients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE,
  
  url TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_type VARCHAR(50),
  client_type VARCHAR(100),
  location JSONB,
  
  INDEX idx_clicks_recipient (recipient_id, clicked_at),
  INDEX idx_clicks_campaign (campaign_id, clicked_at),
  INDEX idx_clicks_url (url, clicked_at)
);

-- 8. Email Templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  subject VARCHAR(500),
  preview_text VARCHAR(200),
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  thumbnail_url TEXT,
  
  -- Variables/merge tags used in template
  variables JSONB DEFAULT '[]',
  
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Unsubscribe Reasons
CREATE TABLE unsubscribe_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES email_contacts(id),
  campaign_id UUID REFERENCES email_campaigns(id),
  reason TEXT,
  feedback TEXT,
  unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Suppression List (global do-not-email)
CREATE TABLE suppression_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  reason VARCHAR(50), -- 'unsubscribed', 'bounced', 'complained', 'manual'
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  notes TEXT
);

-- Helper Functions

-- Function to update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_stats(campaign_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE email_campaigns
  SET 
    sent_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_id_param AND status = 'sent'),
    delivered_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_id_param AND status = 'delivered'),
    opened_count = (SELECT COUNT(DISTINCT recipient_id) FROM email_opens WHERE campaign_id = campaign_id_param),
    clicked_count = (SELECT COUNT(DISTINCT recipient_id) FROM email_clicks WHERE campaign_id = campaign_id_param),
    bounced_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_id_param AND status = 'bounced'),
    unsubscribed_count = (SELECT COUNT(*) FROM campaign_recipients WHERE campaign_id = campaign_id_param AND unsubscribed_at IS NOT NULL),
    open_rate = CASE 
      WHEN delivered_count > 0 THEN (opened_count::DECIMAL / delivered_count) * 100
      ELSE 0
    END,
    click_rate = CASE
      WHEN delivered_count > 0 THEN (clicked_count::DECIMAL / delivered_count) * 100
      ELSE 0
    END,
    bounce_rate = CASE
      WHEN sent_count > 0 THEN (bounced_count::DECIMAL / sent_count) * 100
      ELSE 0
    END,
    updated_at = NOW()
  WHERE id = campaign_id_param;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_lists_updated_at BEFORE UPDATE ON email_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_contacts_updated_at BEFORE UPDATE ON email_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at BEFORE UPDATE ON email_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();