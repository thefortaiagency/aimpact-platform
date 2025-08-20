-- Migration: Add AI Sentiment Analysis Tables
-- Description: Creates tables for AI sentiment analysis, alerts, patterns, and insights
-- Date: 2025-01-15
-- IMPORTANT: This migration is safe to run multiple times - it checks for existence

-- Create enums if they don't exist
DO $$ 
BEGIN
  -- Alert type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_type') THEN
    CREATE TYPE alert_type AS ENUM ('sentiment', 'keyword', 'pattern', 'escalation', 'sla_breach', 'custom');
  END IF;
  
  -- Alert priority enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_priority') THEN
    CREATE TYPE alert_priority AS ENUM ('low', 'medium', 'high', 'urgent');
  END IF;
  
  -- Alert status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_status') THEN
    CREATE TYPE alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
  END IF;
  
  -- Analysis status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_status') THEN
    CREATE TYPE analysis_status AS ENUM ('pending', 'processing', 'completed', 'failed');
  END IF;
END $$;

-- 1. Sentiment Analysis History table
CREATE TABLE IF NOT EXISTS sentiment_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
  
  -- Analysis results
  sentiment VARCHAR(20) NOT NULL,
  sentiment_score REAL NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Detailed analysis
  emotions JSONB DEFAULT '{}' NOT NULL,
  key_phrases JSONB DEFAULT '[]' NOT NULL,
  topics JSONB DEFAULT '[]' NOT NULL,
  entities JSONB DEFAULT '[]' NOT NULL,
  
  -- Language analysis
  language VARCHAR(10),
  language_confidence REAL CHECK (language_confidence >= 0 AND language_confidence <= 1),
  
  -- Model information
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50) NOT NULL,
  analysis_time_ms INTEGER,
  
  -- Metadata
  metadata JSONB DEFAULT '{}' NOT NULL,
  status analysis_status DEFAULT 'completed',
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Alert Configurations table
CREATE TABLE IF NOT EXISTS alert_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Alert details
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type alert_type NOT NULL,
  priority alert_priority DEFAULT 'medium' NOT NULL,
  
  -- Conditions and actions
  conditions JSONB NOT NULL,
  actions JSONB DEFAULT '{}' NOT NULL,
  scope JSONB DEFAULT '{}' NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- 3. Alert History table
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id UUID NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
  communication_id UUID REFERENCES communications(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Alert details
  type alert_type NOT NULL,
  priority alert_priority NOT NULL,
  status alert_status DEFAULT 'active' NOT NULL,
  
  -- Trigger information
  trigger_details JSONB NOT NULL,
  actions_taken JSONB DEFAULT '{}' NOT NULL,
  
  -- Resolution
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Timestamps
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES users(id)
);

-- 4. Communication Patterns table
CREATE TABLE IF NOT EXISTS communication_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  
  -- Pattern identification
  pattern_type VARCHAR(100) NOT NULL,
  pattern_name VARCHAR(255) NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Pattern details
  details JSONB NOT NULL,
  sample_communication_ids JSONB DEFAULT '[]' NOT NULL,
  
  -- Time period
  analyzed_from TIMESTAMP WITH TIME ZONE NOT NULL,
  analyzed_to TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}' NOT NULL,
  
  -- Timestamps
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. AI Insights table
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  communication_id UUID REFERENCES communications(id) ON DELETE CASCADE,
  
  -- Insight details
  insight_type VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Insight data
  data JSONB NOT NULL,
  
  -- Impact and priority
  impact_score REAL CHECK (impact_score >= 0 AND impact_score <= 1),
  priority alert_priority DEFAULT 'medium',
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Actions
  action_taken BOOLEAN DEFAULT false,
  action_details JSONB,
  
  -- Feedback
  was_helpful BOOLEAN,
  feedback_notes TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  viewed_at TIMESTAMP WITH TIME ZONE,
  dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_communication ON sentiment_analysis(communication_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_sentiment ON sentiment_analysis(sentiment);
CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_created_at ON sentiment_analysis(created_at);

CREATE INDEX IF NOT EXISTS idx_alert_configs_org ON alert_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_user ON alert_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_alert_configs_type ON alert_configs(type);
CREATE INDEX IF NOT EXISTS idx_alert_configs_active ON alert_configs(is_active);

CREATE INDEX IF NOT EXISTS idx_alert_history_config ON alert_history(alert_config_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_comm ON alert_history(communication_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_org ON alert_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(status);
CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON alert_history(triggered_at);

CREATE INDEX IF NOT EXISTS idx_patterns_org ON communication_patterns(organization_id);
CREATE INDEX IF NOT EXISTS idx_patterns_contact ON communication_patterns(contact_id);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON communication_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_detected ON communication_patterns(detected_at);

CREATE INDEX IF NOT EXISTS idx_insights_org ON ai_insights(organization_id);
CREATE INDEX IF NOT EXISTS idx_insights_contact ON ai_insights(contact_id);
CREATE INDEX IF NOT EXISTS idx_insights_comm ON ai_insights(communication_id);
CREATE INDEX IF NOT EXISTS idx_insights_type ON ai_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_insights_status ON ai_insights(status);
CREATE INDEX IF NOT EXISTS idx_insights_generated ON ai_insights(generated_at);

-- Additional performance indexes for AI queries
CREATE INDEX IF NOT EXISTS idx_communications_sentiment_org ON communications(sentiment, organization_id) WHERE sentiment IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_communications_flagged_assigned ON communications(is_flagged, assigned_to) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_communications_unread_org ON communications(is_read, organization_id) WHERE is_read = false;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_alert_configs_updated_at BEFORE UPDATE ON alert_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patterns_updated_at BEFORE UPDATE ON communication_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE sentiment_analysis IS 'Stores detailed sentiment analysis results for each communication';
COMMENT ON TABLE alert_configs IS 'User-defined alert configurations for AI-driven notifications';
COMMENT ON TABLE alert_history IS 'Historical record of all triggered alerts';
COMMENT ON TABLE communication_patterns IS 'AI-detected patterns in communication behavior';
COMMENT ON TABLE ai_insights IS 'AI-generated insights and recommendations';

-- Verify the communications table has all required columns
-- This is a safety check - these columns should already exist
DO $$
BEGIN
  -- Check if columns exist, if not, add them
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'sentiment') THEN
    ALTER TABLE communications ADD COLUMN sentiment sentiment;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'sentiment_score') THEN
    ALTER TABLE communications ADD COLUMN sentiment_score REAL CHECK (sentiment_score >= -1 AND sentiment_score <= 1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'keywords') THEN
    ALTER TABLE communications ADD COLUMN keywords JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'entities') THEN
    ALTER TABLE communications ADD COLUMN entities JSONB DEFAULT '[]';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'ai_insights') THEN
    ALTER TABLE communications ADD COLUMN ai_insights JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'is_read') THEN
    ALTER TABLE communications ADD COLUMN is_read BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'is_archived') THEN
    ALTER TABLE communications ADD COLUMN is_archived BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'is_flagged') THEN
    ALTER TABLE communications ADD COLUMN is_flagged BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communications' AND column_name = 'assigned_to') THEN
    ALTER TABLE communications ADD COLUMN assigned_to UUID REFERENCES users(id);
  END IF;
END $$;

-- Grant permissions (adjust based on your database user)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- Migration complete message
DO $$ 
BEGIN 
  RAISE NOTICE 'AI tables migration completed successfully!';
  RAISE NOTICE 'Tables created: sentiment_analysis, alert_configs, alert_history, communication_patterns, ai_insights';
  RAISE NOTICE 'All indexes have been created for optimal performance';
END $$;