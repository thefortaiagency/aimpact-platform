import { InferInsertModel, InferSelectModel, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  boolean,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  primaryKey,
  real,
} from "drizzle-orm/pg-core";
import { users } from "./schema";
import { organizations, contacts, communications } from "./schema-communications";

// Enums for AI features
export const alertTypeEnum = pgEnum('alert_type', ['sentiment', 'keyword', 'pattern', 'escalation', 'sla_breach', 'custom']);
export const alertPriorityEnum = pgEnum('alert_priority', ['low', 'medium', 'high', 'urgent']);
export const alertStatusEnum = pgEnum('alert_status', ['active', 'acknowledged', 'resolved', 'dismissed']);
export const analysisStatusEnum = pgEnum('analysis_status', ['pending', 'processing', 'completed', 'failed']);

// Sentiment Analysis History table
export const sentimentAnalysis = pgTable("sentiment_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  communicationId: uuid("communication_id").notNull().references(() => communications.id, { onDelete: "cascade" }),
  
  // Analysis results
  sentiment: varchar("sentiment", { length: 20 }).notNull(), // positive, neutral, negative
  sentimentScore: real("sentiment_score").notNull(), // -1 to 1
  confidence: real("confidence").notNull(), // 0 to 1
  
  // Detailed analysis
  emotions: jsonb("emotions").$type<{
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
    disgust?: number;
  }>().default({}),
  
  // Key phrases and topics
  keyPhrases: jsonb("key_phrases").$type<string[]>().default([]),
  topics: jsonb("topics").$type<Array<{
    topic: string;
    confidence: number;
  }>>().default([]),
  
  // Entities detected
  entities: jsonb("entities").$type<Array<{
    type: string; // person, organization, location, date, etc.
    value: string;
    confidence: number;
    metadata?: Record<string, any>;
  }>>().default([]),
  
  // Language analysis
  language: varchar("language", { length: 10 }),
  languageConfidence: real("language_confidence"),
  
  // Model information
  modelName: varchar("model_name", { length: 100 }).notNull(),
  modelVersion: varchar("model_version", { length: 50 }).notNull(),
  analysisTimeMs: integer("analysis_time_ms"),
  
  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  status: analysisStatusEnum("status").default('completed'),
  errorMessage: text("error_message"),
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  communicationIdx: index("sentiment_analysis_communication_idx").on(table.communicationId),
  sentimentIdx: index("sentiment_analysis_sentiment_idx").on(table.sentiment),
  createdAtIdx: index("sentiment_analysis_created_at_idx").on(table.createdAt),
}));

// Alert Configurations table
export const alertConfigs = pgTable("alert_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  
  // Alert details
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  type: alertTypeEnum("type").notNull(),
  priority: alertPriorityEnum("priority").default('medium').notNull(),
  
  // Conditions
  conditions: jsonb("conditions").$type<{
    // Sentiment conditions
    sentimentThreshold?: number;
    sentimentType?: 'positive' | 'negative' | 'any';
    
    // Keyword conditions
    keywords?: string[];
    keywordMatchType?: 'any' | 'all';
    
    // Pattern conditions
    patternRegex?: string;
    
    // Volume conditions
    volumeThreshold?: number;
    volumePeriodMinutes?: number;
    
    // Custom conditions
    customConditions?: Record<string, any>;
  }>().notNull(),
  
  // Actions
  actions: jsonb("actions").$type<{
    notify?: {
      email?: boolean;
      sms?: boolean;
      webhook?: string;
      inApp?: boolean;
    };
    autoAssign?: {
      userId?: string;
      teamId?: string;
      escalationPath?: string[];
    };
    autoRespond?: {
      templateId?: string;
      message?: string;
    };
  }>().default({}),
  
  // Scope
  scope: jsonb("scope").$type<{
    contactIds?: string[];
    organizationIds?: string[];
    communicationTypes?: string[];
    tags?: string[];
  }>().default({}),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (table) => ({
  orgIdx: index("alert_configs_org_idx").on(table.organizationId),
  userIdx: index("alert_configs_user_idx").on(table.userId),
  typeIdx: index("alert_configs_type_idx").on(table.type),
  activeIdx: index("alert_configs_active_idx").on(table.isActive),
}));

// Alert History table
export const alertHistory = pgTable("alert_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  alertConfigId: uuid("alert_config_id").notNull().references(() => alertConfigs.id, { onDelete: "cascade" }),
  communicationId: uuid("communication_id").references(() => communications.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  // Alert details
  type: alertTypeEnum("type").notNull(),
  priority: alertPriorityEnum("priority").notNull(),
  status: alertStatusEnum("status").default('active').notNull(),
  
  // Trigger information
  triggerDetails: jsonb("trigger_details").$type<{
    matchedConditions: Record<string, any>;
    sentimentScore?: number;
    matchedKeywords?: string[];
    patternMatches?: string[];
    additionalData?: Record<string, any>;
  }>().notNull(),
  
  // Actions taken
  actionsTaken: jsonb("actions_taken").$type<{
    notifications?: Array<{
      type: string;
      recipient: string;
      sentAt: string;
      status: string;
    }>;
    assignments?: Array<{
      userId: string;
      assignedAt: string;
    }>;
    autoResponses?: Array<{
      messageId: string;
      sentAt: string;
    }>;
  }>().default({}),
  
  // Resolution
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at", { mode: "string" }),
  resolutionNotes: text("resolution_notes"),
  
  // Timestamps
  triggeredAt: timestamp("triggered_at", { mode: "string" }).defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at", { mode: "string" }),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
}, (table) => ({
  configIdx: index("alert_history_config_idx").on(table.alertConfigId),
  commIdx: index("alert_history_comm_idx").on(table.communicationId),
  orgIdx: index("alert_history_org_idx").on(table.organizationId),
  statusIdx: index("alert_history_status_idx").on(table.status),
  triggeredIdx: index("alert_history_triggered_idx").on(table.triggeredAt),
}));

// Communication Patterns table
export const communicationPatterns = pgTable("communication_patterns", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  
  // Pattern identification
  patternType: varchar("pattern_type", { length: 100 }).notNull(), // escalation, satisfaction_drop, churn_risk, etc.
  patternName: varchar("pattern_name", { length: 255 }).notNull(),
  confidence: real("confidence").notNull(), // 0 to 1
  
  // Pattern details
  details: jsonb("details").$type<{
    // Time-based patterns
    frequency?: {
      averagePerDay?: number;
      averagePerWeek?: number;
      trend?: 'increasing' | 'decreasing' | 'stable';
    };
    
    // Sentiment patterns
    sentimentTrend?: {
      direction: 'improving' | 'declining' | 'stable';
      rate: number;
      recentScores: number[];
    };
    
    // Communication patterns
    preferredChannels?: string[];
    responseTime?: {
      average: number;
      trend: string;
    };
    
    // Risk indicators
    riskScore?: number;
    riskFactors?: string[];
    
    // Custom patterns
    customMetrics?: Record<string, any>;
  }>().notNull(),
  
  // Related communications
  sampleCommunicationIds: jsonb("sample_communication_ids").$type<string[]>().default([]),
  
  // Time period
  analyzedFrom: timestamp("analyzed_from", { mode: "string" }).notNull(),
  analyzedTo: timestamp("analyzed_to", { mode: "string" }).notNull(),
  
  // Status
  isActive: boolean("is_active").default(true),
  expiresAt: timestamp("expires_at", { mode: "string" }),
  
  // Metadata
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  
  // Timestamps
  detectedAt: timestamp("detected_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  orgIdx: index("patterns_org_idx").on(table.organizationId),
  contactIdx: index("patterns_contact_idx").on(table.contactId),
  typeIdx: index("patterns_type_idx").on(table.patternType),
  detectedIdx: index("patterns_detected_idx").on(table.detectedAt),
}));

// AI Insights table
export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  communicationId: uuid("communication_id").references(() => communications.id, { onDelete: "cascade" }),
  
  // Insight details
  insightType: varchar("insight_type", { length: 100 }).notNull(), // recommendation, prediction, anomaly, opportunity
  category: varchar("category", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  
  // Insight data
  data: jsonb("data").$type<{
    // Recommendations
    suggestedActions?: Array<{
      action: string;
      priority: string;
      expectedOutcome?: string;
    }>;
    
    // Predictions
    predictions?: Array<{
      metric: string;
      value: number | string;
      confidence: number;
      timeframe?: string;
    }>;
    
    // Anomalies
    anomalyDetails?: {
      type: string;
      severity: string;
      deviation: number;
      baseline: number;
    };
    
    // Opportunities
    opportunityScore?: number;
    potentialValue?: number;
    
    // Supporting data
    supportingMetrics?: Record<string, any>;
    relatedCommunications?: string[];
  }>().notNull(),
  
  // Impact and priority
  impactScore: real("impact_score"), // 0 to 1
  priority: alertPriorityEnum("priority").default('medium'),
  confidence: real("confidence").notNull(), // 0 to 1
  
  // Actions
  actionTaken: boolean("action_taken").default(false),
  actionDetails: jsonb("action_details").$type<{
    action: string;
    takenBy: string;
    takenAt: string;
    outcome?: string;
  }>(),
  
  // Feedback
  wasHelpful: boolean("was_helpful"),
  feedbackNotes: text("feedback_notes"),
  
  // Status
  status: varchar("status", { length: 50 }).default('active'), // active, dismissed, acted_upon, expired
  expiresAt: timestamp("expires_at", { mode: "string" }),
  
  // Timestamps
  generatedAt: timestamp("generated_at", { mode: "string" }).defaultNow(),
  viewedAt: timestamp("viewed_at", { mode: "string" }),
  dismissedAt: timestamp("dismissed_at", { mode: "string" }),
}, (table) => ({
  orgIdx: index("insights_org_idx").on(table.organizationId),
  contactIdx: index("insights_contact_idx").on(table.contactId),
  commIdx: index("insights_comm_idx").on(table.communicationId),
  typeIdx: index("insights_type_idx").on(table.insightType),
  statusIdx: index("insights_status_idx").on(table.status),
  generatedIdx: index("insights_generated_idx").on(table.generatedAt),
}));

// Define relations
export const sentimentAnalysisRelations = relations(sentimentAnalysis, ({ one }) => ({
  communication: one(communications, {
    fields: [sentimentAnalysis.communicationId],
    references: [communications.id],
  }),
}));

export const alertConfigsRelations = relations(alertConfigs, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [alertConfigs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [alertConfigs.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [alertConfigs.createdBy],
    references: [users.id],
  }),
  alertHistory: many(alertHistory),
}));

export const alertHistoryRelations = relations(alertHistory, ({ one }) => ({
  alertConfig: one(alertConfigs, {
    fields: [alertHistory.alertConfigId],
    references: [alertConfigs.id],
  }),
  communication: one(communications, {
    fields: [alertHistory.communicationId],
    references: [communications.id],
  }),
  organization: one(organizations, {
    fields: [alertHistory.organizationId],
    references: [organizations.id],
  }),
  resolvedByUser: one(users, {
    fields: [alertHistory.resolvedBy],
    references: [users.id],
  }),
  acknowledgedByUser: one(users, {
    fields: [alertHistory.acknowledgedBy],
    references: [users.id],
  }),
}));

export const communicationPatternsRelations = relations(communicationPatterns, ({ one }) => ({
  organization: one(organizations, {
    fields: [communicationPatterns.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [communicationPatterns.contactId],
    references: [contacts.id],
  }),
}));

export const aiInsightsRelations = relations(aiInsights, ({ one }) => ({
  organization: one(organizations, {
    fields: [aiInsights.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [aiInsights.contactId],
    references: [contacts.id],
  }),
  communication: one(communications, {
    fields: [aiInsights.communicationId],
    references: [communications.id],
  }),
}));

// Type exports
export type SentimentAnalysis = InferSelectModel<typeof sentimentAnalysis>;
export type SentimentAnalysisInsert = InferInsertModel<typeof sentimentAnalysis>;

export type AlertConfig = InferSelectModel<typeof alertConfigs>;
export type AlertConfigInsert = InferInsertModel<typeof alertConfigs>;

export type AlertHistory = InferSelectModel<typeof alertHistory>;
export type AlertHistoryInsert = InferInsertModel<typeof alertHistory>;

export type CommunicationPattern = InferSelectModel<typeof communicationPatterns>;
export type CommunicationPatternInsert = InferInsertModel<typeof communicationPatterns>;

export type AIInsight = InferSelectModel<typeof aiInsights>;
export type AIInsightInsert = InferInsertModel<typeof aiInsights>;