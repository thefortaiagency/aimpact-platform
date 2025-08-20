import { sql } from 'drizzle-orm';
import { db } from '../drizzle';

export async function runAITablesMigration() {
  console.log('🚀 Starting AI tables migration...');
  
  try {
    // Run the SQL migration file
    await db.execute(sql`
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
    `);

    // Create sentiment_analysis table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sentiment_analysis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        communication_id UUID NOT NULL REFERENCES communications(id) ON DELETE CASCADE,
        sentiment VARCHAR(20) NOT NULL,
        sentiment_score REAL NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
        confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
        emotions JSONB DEFAULT '{}' NOT NULL,
        key_phrases JSONB DEFAULT '[]' NOT NULL,
        topics JSONB DEFAULT '[]' NOT NULL,
        entities JSONB DEFAULT '[]' NOT NULL,
        language VARCHAR(10),
        language_confidence REAL CHECK (language_confidence >= 0 AND language_confidence <= 1),
        model_name VARCHAR(100) NOT NULL,
        model_version VARCHAR(50) NOT NULL,
        analysis_time_ms INTEGER,
        metadata JSONB DEFAULT '{}' NOT NULL,
        status analysis_status DEFAULT 'completed',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create alert_configs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS alert_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type alert_type NOT NULL,
        priority alert_priority DEFAULT 'medium' NOT NULL,
        conditions JSONB NOT NULL,
        actions JSONB DEFAULT '{}' NOT NULL,
        scope JSONB DEFAULT '{}' NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by UUID REFERENCES users(id)
      );
    `);

    // Create alert_history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS alert_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alert_config_id UUID NOT NULL REFERENCES alert_configs(id) ON DELETE CASCADE,
        communication_id UUID REFERENCES communications(id) ON DELETE CASCADE,
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        type alert_type NOT NULL,
        priority alert_priority NOT NULL,
        status alert_status DEFAULT 'active' NOT NULL,
        trigger_details JSONB NOT NULL,
        actions_taken JSONB DEFAULT '{}' NOT NULL,
        resolved_by UUID REFERENCES users(id),
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolution_notes TEXT,
        triggered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at TIMESTAMP WITH TIME ZONE,
        acknowledged_by UUID REFERENCES users(id)
      );
    `);

    // Create communication_patterns table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS communication_patterns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        pattern_type VARCHAR(100) NOT NULL,
        pattern_name VARCHAR(255) NOT NULL,
        confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
        details JSONB NOT NULL,
        sample_communication_ids JSONB DEFAULT '[]' NOT NULL,
        analyzed_from TIMESTAMP WITH TIME ZONE NOT NULL,
        analyzed_to TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP WITH TIME ZONE,
        metadata JSONB DEFAULT '{}' NOT NULL,
        detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create ai_insights table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
        contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
        communication_id UUID REFERENCES communications(id) ON DELETE CASCADE,
        insight_type VARCHAR(100) NOT NULL,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        data JSONB NOT NULL,
        impact_score REAL CHECK (impact_score >= 0 AND impact_score <= 1),
        priority alert_priority DEFAULT 'medium',
        confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
        action_taken BOOLEAN DEFAULT false,
        action_details JSONB,
        was_helpful BOOLEAN,
        feedback_notes TEXT,
        status VARCHAR(50) DEFAULT 'active',
        expires_at TIMESTAMP WITH TIME ZONE,
        generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        viewed_at TIMESTAMP WITH TIME ZONE,
        dismissed_at TIMESTAMP WITH TIME ZONE
      );
    `);

    // Create all indexes
    console.log('📊 Creating indexes for optimal performance...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_communication ON sentiment_analysis(communication_id)',
      'CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_sentiment ON sentiment_analysis(sentiment)',
      'CREATE INDEX IF NOT EXISTS idx_sentiment_analysis_created_at ON sentiment_analysis(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_alert_configs_org ON alert_configs(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_alert_configs_user ON alert_configs(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_alert_configs_type ON alert_configs(type)',
      'CREATE INDEX IF NOT EXISTS idx_alert_configs_active ON alert_configs(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_alert_history_config ON alert_history(alert_config_id)',
      'CREATE INDEX IF NOT EXISTS idx_alert_history_comm ON alert_history(communication_id)',
      'CREATE INDEX IF NOT EXISTS idx_alert_history_org ON alert_history(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_alert_history_status ON alert_history(status)',
      'CREATE INDEX IF NOT EXISTS idx_alert_history_triggered ON alert_history(triggered_at)',
      'CREATE INDEX IF NOT EXISTS idx_patterns_org ON communication_patterns(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_patterns_contact ON communication_patterns(contact_id)',
      'CREATE INDEX IF NOT EXISTS idx_patterns_type ON communication_patterns(pattern_type)',
      'CREATE INDEX IF NOT EXISTS idx_patterns_detected ON communication_patterns(detected_at)',
      'CREATE INDEX IF NOT EXISTS idx_insights_org ON ai_insights(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_insights_contact ON ai_insights(contact_id)',
      'CREATE INDEX IF NOT EXISTS idx_insights_comm ON ai_insights(communication_id)',
      'CREATE INDEX IF NOT EXISTS idx_insights_type ON ai_insights(insight_type)',
      'CREATE INDEX IF NOT EXISTS idx_insights_status ON ai_insights(status)',
      'CREATE INDEX IF NOT EXISTS idx_insights_generated ON ai_insights(generated_at)',
      'CREATE INDEX IF NOT EXISTS idx_communications_sentiment_org ON communications(sentiment, organization_id) WHERE sentiment IS NOT NULL',
      'CREATE INDEX IF NOT EXISTS idx_communications_flagged_assigned ON communications(is_flagged, assigned_to) WHERE is_flagged = true',
      'CREATE INDEX IF NOT EXISTS idx_communications_unread_org ON communications(is_read, organization_id) WHERE is_read = false'
    ];

    for (const index of indexes) {
      await db.execute(sql.raw(index));
    }

    // Create update trigger function
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers
    await db.execute(sql`
      CREATE TRIGGER update_alert_configs_updated_at BEFORE UPDATE ON alert_configs
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await db.execute(sql`
      CREATE TRIGGER update_patterns_updated_at BEFORE UPDATE ON communication_patterns
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ AI tables migration completed successfully!');
    console.log('📋 Tables created:');
    console.log('   - sentiment_analysis');
    console.log('   - alert_configs');
    console.log('   - alert_history');
    console.log('   - communication_patterns');
    console.log('   - ai_insights');
    console.log('🔍 All indexes have been created for optimal performance');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Check if tables exist
export async function checkAITablesExist() {
  const tables = ['sentiment_analysis', 'alert_configs', 'alert_history', 'communication_patterns', 'ai_insights'];
  const results: Record<string, boolean> = {};
  
  for (const table of tables) {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = ${table}
      );
    `);
    results[table] = result.rows[0].exists;
  }
  
  return results;
}

// Run migration if called directly
if (require.main === module) {
  runAITablesMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}