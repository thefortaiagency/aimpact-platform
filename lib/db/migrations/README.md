# AI Sentiment Analysis Database Migration

This migration adds the necessary tables and columns for AI sentiment analysis capabilities to the AImpact platform.

## What This Migration Does

### 1. Verifies Existing Communications Table
The communications table already has all required AI columns:
- `sentiment` - Sentiment classification (positive/neutral/negative)
- `sentiment_score` - Numerical sentiment score (-1 to 1)
- `keywords` - Extracted keywords array
- `entities` - Detected entities (people, organizations, locations)
- `ai_insights` - AI-generated insights object
- `is_read` - Read status tracking
- `is_archived` - Archive status
- `is_flagged` - Flag for important items
- `assigned_to` - User assignment

### 2. Creates New AI Tables

#### sentiment_analysis
- Stores detailed sentiment analysis history for each communication
- Includes emotions, key phrases, topics, and entities
- Tracks model versions and performance metrics

#### alert_configs
- User-defined alert rules based on AI analysis
- Supports sentiment thresholds, keyword matching, patterns
- Configurable actions (notify, assign, auto-respond)

#### alert_history
- Historical record of all triggered alerts
- Tracks acknowledgment and resolution
- Stores trigger details and actions taken

#### communication_patterns
- AI-detected patterns in communication behavior
- Identifies escalations, satisfaction trends, churn risk
- Time-based analysis with confidence scores

#### ai_insights
- AI-generated recommendations and predictions
- Anomaly detection and opportunity identification
- Tracks user feedback and action outcomes

### 3. Performance Optimizations
- Creates 25+ indexes for optimal query performance
- Includes composite indexes for common AI queries
- Partial indexes for filtered searches

## How to Run the Migration

### Option 1: Using the TypeScript Script (Recommended)
```bash
# From the project root
npm run tsx scripts/run-ai-migration.ts
```

### Option 2: Using SQL Directly
```bash
# Connect to your database and run:
psql $DATABASE_URL < lib/db/migrations/add-ai-tables.sql
```

### Option 3: In Your Application
```typescript
import { runAITablesMigration } from '@/lib/db/migrations/add-ai-tables';

// Run the migration
await runAITablesMigration();
```

## Backward Compatibility

✅ **This migration is 100% backward compatible:**
- Uses `CREATE TABLE IF NOT EXISTS` for all tables
- Uses `CREATE INDEX IF NOT EXISTS` for all indexes
- Checks column existence before adding
- Existing data is preserved
- Can be run multiple times safely

## Usage After Migration

### 1. Sentiment Analysis
```typescript
import { db } from '@/lib/db/drizzle';
import { sentimentAnalysis } from '@/lib/db/schema-ai';

// Store sentiment analysis results
await db.insert(sentimentAnalysis).values({
  communicationId: 'comm-id',
  sentiment: 'positive',
  sentimentScore: 0.85,
  confidence: 0.92,
  keyPhrases: ['great service', 'very satisfied'],
  modelName: 'ethical-sentiment-v1',
  modelVersion: '1.0.0'
});
```

### 2. Alert Configuration
```typescript
import { alertConfigs } from '@/lib/db/schema-ai';

// Create an alert for negative sentiment
await db.insert(alertConfigs).values({
  name: 'Negative Sentiment Alert',
  type: 'sentiment',
  priority: 'high',
  conditions: {
    sentimentType: 'negative',
    sentimentThreshold: -0.5
  },
  actions: {
    notify: { email: true, inApp: true },
    autoAssign: { userId: 'manager-id' }
  }
});
```

### 3. Pattern Detection
```typescript
import { communicationPatterns } from '@/lib/db/schema-ai';

// Record a detected pattern
await db.insert(communicationPatterns).values({
  organizationId: 'org-id',
  contactId: 'contact-id',
  patternType: 'escalation',
  patternName: 'Sentiment Decline',
  confidence: 0.87,
  details: {
    sentimentTrend: {
      direction: 'declining',
      rate: -0.15,
      recentScores: [0.2, -0.1, -0.3, -0.5]
    }
  }
});
```

## Rollback (If Needed)

To rollback the migration:
```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS ai_insights CASCADE;
DROP TABLE IF EXISTS communication_patterns CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS alert_configs CASCADE;
DROP TABLE IF EXISTS sentiment_analysis CASCADE;

-- Drop enums
DROP TYPE IF EXISTS analysis_status CASCADE;
DROP TYPE IF EXISTS alert_status CASCADE;
DROP TYPE IF EXISTS alert_priority CASCADE;
DROP TYPE IF EXISTS alert_type CASCADE;
```

## Important Notes

1. **For USA Wrestling Deployment**: The existing communications table already has all required columns, so the core functionality won't be disrupted.

2. **Performance**: All indexes are created to ensure AI queries don't impact system performance.

3. **Privacy**: The schema supports ethical AI implementation with user consent tracking and transparent analysis.

4. **Scalability**: Tables are designed to handle millions of communications with efficient querying.