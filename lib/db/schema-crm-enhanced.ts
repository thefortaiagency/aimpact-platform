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
  real,
  numeric,
} from "drizzle-orm/pg-core";
import { users } from "./schema";
import { organizations, contacts, communications, tickets } from "./schema-communications";
import { deals, activities } from "./schema-crm";

// Enhanced Enums
export const prospectStatusEnum = pgEnum('prospect_status', [
  'cold',
  'warm',
  'hot',
  'qualified',
  'unqualified',
  'nurturing'
]);

export const dataSourceEnum = pgEnum('data_source', [
  'manual',
  'google_business',
  'website_scan',
  'linkedin',
  'crunchbase',
  'clearbit',
  'apollo',
  'nexus_analyzer',
  'email_signature',
  'support_ticket'
]);

// Organization Tech Stack table - tracks all technology used by the organization
export const organizationTechStack = pgTable("organization_tech_stack", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  
  // Technology details
  category: varchar("category", { length: 100 }).notNull(), // CRM, Email, Analytics, etc.
  name: varchar("name", { length: 255 }).notNull(), // Salesforce, Gmail, Google Analytics
  version: varchar("version", { length: 50 }),
  vendor: varchar("vendor", { length: 255 }),
  
  // Usage and licensing
  licenseType: varchar("license_type", { length: 100 }), // subscription, perpetual, freemium
  licenseCount: integer("license_count"),
  monthlyCost: numeric("monthly_cost", { precision: 10, scale: 2 }),
  renewalDate: timestamp("renewal_date", { mode: "string" }),
  
  // Detection and confidence
  detectedVia: dataSourceEnum("detected_via").notNull(),
  confidence: real("confidence").default(1.0), // 0-1 confidence score
  lastVerified: timestamp("last_verified", { mode: "string" }).defaultNow(),
  isActive: boolean("is_active").default(true),
  
  // Additional metadata
  apiEndpoint: text("api_endpoint"),
  integrationStatus: varchar("integration_status", { length: 50 }), // connected, pending, failed
  features: jsonb("features").$type<string[]>().default([]),
  limitations: jsonb("limitations").$type<string[]>().default([]),
  
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  orgIdx: index("org_tech_stack_org_idx").on(table.organizationId),
  categoryIdx: index("org_tech_stack_category_idx").on(table.category),
  nameIdx: index("org_tech_stack_name_idx").on(table.name),
}));

// Organization Industry Intel - deep industry-specific information
export const organizationIndustryIntel = pgTable("organization_industry_intel", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).unique().notNull(),
  
  // Industry classification
  primaryIndustry: varchar("primary_industry", { length: 255 }).notNull(),
  secondaryIndustries: jsonb("secondary_industries").$type<string[]>().default([]),
  naicsCode: varchar("naics_code", { length: 10 }),
  sicCode: varchar("sic_code", { length: 10 }),
  
  // Business metrics
  employeeCount: integer("employee_count"),
  employeeRange: varchar("employee_range", { length: 50 }), // 1-10, 11-50, etc.
  annualRevenue: numeric("annual_revenue", { precision: 15, scale: 2 }),
  revenueRange: varchar("revenue_range", { length: 50 }), // <$1M, $1-10M, etc.
  yearFounded: integer("year_founded"),
  
  // Market position
  marketPosition: varchar("market_position", { length: 50 }), // leader, challenger, niche
  competitors: jsonb("competitors").$type<Array<{
    name: string;
    website?: string;
    relationship?: string; // direct, indirect, partner
  }>>().default([]),
  
  // Pain points and opportunities
  identifiedPainPoints: jsonb("pain_points").$type<Array<{
    category: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    solution?: string;
  }>>().default([]),
  
  opportunities: jsonb("opportunities").$type<Array<{
    type: string;
    description: string;
    value?: number;
    timeline?: string;
  }>>().default([]),
  
  // Compliance and certifications
  certifications: jsonb("certifications").$type<string[]>().default([]),
  complianceRequirements: jsonb("compliance_requirements").$type<string[]>().default([]),
  
  // Business model
  businessModel: varchar("business_model", { length: 100 }), // B2B, B2C, B2B2C, etc.
  salesCycle: varchar("sales_cycle", { length: 50 }), // transactional, short, medium, long
  decisionMakingProcess: text("decision_making_process"),
  budgetCycle: varchar("budget_cycle", { length: 50 }), // quarterly, annual, etc.
  
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  orgIdx: uniqueIndex("org_industry_intel_org_idx").on(table.organizationId),
  industryIdx: index("org_industry_intel_industry_idx").on(table.primaryIndustry),
}));

// Google Business Integration - store enriched data from Google Business API
export const googleBusinessData = pgTable("google_business_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).unique().notNull(),
  
  // Google Business identifiers
  googlePlaceId: varchar("google_place_id", { length: 255 }).unique(),
  googleMapsUrl: text("google_maps_url"),
  
  // Business information
  businessName: varchar("business_name", { length: 255 }),
  businessType: jsonb("business_types").$type<string[]>().default([]),
  formattedAddress: text("formatted_address"),
  coordinates: jsonb("coordinates").$type<{
    lat: number;
    lng: number;
  }>(),
  
  // Contact information from Google
  phoneNumber: varchar("phone_number", { length: 50 }),
  website: text("website"),
  
  // Operating hours
  operatingHours: jsonb("operating_hours").$type<Record<string, {
    open: string;
    close: string;
    is24Hours?: boolean;
  }>>().default({}),
  
  // Reviews and ratings
  rating: real("rating"), // 1-5
  totalReviews: integer("total_reviews"),
  recentReviews: jsonb("recent_reviews").$type<Array<{
    author: string;
    rating: number;
    text: string;
    time: string;
  }>>().default([]),
  
  // Photos and media
  photos: jsonb("photos").$type<Array<{
    url: string;
    caption?: string;
    type?: string;
  }>>().default([]),
  
  // Additional Google data
  priceLevel: integer("price_level"), // 0-4 scale
  attributes: jsonb("attributes").$type<Record<string, any>>().default({}),
  popularTimes: jsonb("popular_times").$type<Record<string, any>>().default({}),
  
  // Sync metadata
  lastSyncedAt: timestamp("last_synced_at", { mode: "string" }).defaultNow(),
  syncStatus: varchar("sync_status", { length: 50 }).default('success'),
  syncErrors: jsonb("sync_errors").$type<any[]>().default([]),
  
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  orgIdx: uniqueIndex("google_business_org_idx").on(table.organizationId),
  placeIdx: uniqueIndex("google_business_place_idx").on(table.googlePlaceId),
}));

// Prospect Intelligence - AI-powered prospect analysis
export const prospectIntelligence = pgTable("prospect_intelligence", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  
  // Prospect status
  status: prospectStatusEnum("status").default('cold').notNull(),
  qualificationScore: integer("qualification_score").default(0), // 0-100
  
  // Buying signals
  buyingSignals: jsonb("buying_signals").$type<Array<{
    type: string; // budget_allocated, vendor_research, rfp_issued, etc.
    description: string;
    detectedAt: string;
    confidence: number;
    source: string;
  }>>().default([]),
  
  // Intent data
  intentTopics: jsonb("intent_topics").$type<Array<{
    topic: string;
    score: number;
    keywords: string[];
  }>>().default([]),
  
  // Engagement tracking
  websiteVisits: jsonb("website_visits").$type<Array<{
    page: string;
    timestamp: string;
    duration: number;
    referrer?: string;
  }>>().default([]),
  
  contentEngagement: jsonb("content_engagement").$type<Array<{
    contentType: string;
    title: string;
    engagedAt: string;
    engagementDepth: number; // 0-100
  }>>().default([]),
  
  // Communication preferences
  bestTimeToContact: jsonb("best_time_to_contact").$type<{
    days: string[];
    timeRange: { start: string; end: string };
    timezone: string;
  }>(),
  
  // Predictive analytics
  predictedCloseDate: timestamp("predicted_close_date", { mode: "string" }),
  predictedDealSize: numeric("predicted_deal_size", { precision: 15, scale: 2 }),
  churnRisk: real("churn_risk"), // 0-1
  expansionPotential: real("expansion_potential"), // 0-1
  
  // AI insights
  nexusAnalysis: jsonb("nexus_analysis").$type<{
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    competitiveAdvantage: string;
  }>(),
  
  // AML (Actionable Machine Learning) data
  amlActions: jsonb("aml_actions").$type<Array<{
    action: string;
    executedAt: string;
    result: string;
    nextAction?: string;
  }>>().default([]),
  
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  orgIdx: index("prospect_intel_org_idx").on(table.organizationId),
  contactIdx: index("prospect_intel_contact_idx").on(table.contactId),
  statusIdx: index("prospect_intel_status_idx").on(table.status),
  scoreIdx: index("prospect_intel_score_idx").on(table.qualificationScore),
}));

// Unified Client Context - the master view of everything about a client
export const unifiedClientContext = pgTable("unified_client_context", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).unique().notNull(),
  
  // Aggregated scores
  overallHealthScore: integer("overall_health_score").default(0), // 0-100
  engagementScore: integer("engagement_score").default(0), // 0-100
  satisfactionScore: integer("satisfaction_score").default(0), // 0-100
  riskScore: integer("risk_score").default(0), // 0-100
  opportunityScore: integer("opportunity_score").default(0), // 0-100
  
  // Relationship summary
  relationshipStage: varchar("relationship_stage", { length: 50 }), // prospect, customer, partner, etc.
  relationshipStrength: varchar("relationship_strength", { length: 50 }), // weak, moderate, strong
  primaryContact: uuid("primary_contact").references(() => contacts.id),
  accountManager: uuid("account_manager").references(() => users.id),
  
  // Financial summary
  totalRevenue: numeric("total_revenue", { precision: 15, scale: 2 }).default('0'),
  totalPipelineValue: numeric("total_pipeline_value", { precision: 15, scale: 2 }).default('0'),
  avgDealSize: numeric("avg_deal_size", { precision: 15, scale: 2 }),
  paymentTerms: varchar("payment_terms", { length: 100 }),
  creditLimit: numeric("credit_limit", { precision: 15, scale: 2 }),
  
  // Communication summary
  totalCommunications: integer("total_communications").default(0),
  lastCommunicationDate: timestamp("last_communication_date", { mode: "string" }),
  avgResponseTime: integer("avg_response_time"), // in hours
  preferredCommunicationChannel: varchar("preferred_channel", { length: 50 }),
  
  // Support summary
  totalTickets: integer("total_tickets").default(0),
  openTickets: integer("open_tickets").default(0),
  avgResolutionTime: integer("avg_resolution_time"), // in hours
  supportTier: varchar("support_tier", { length: 50 }), // basic, premium, enterprise
  
  // Product usage (if applicable)
  productsUsed: jsonb("products_used").$type<string[]>().default([]),
  featureAdoption: jsonb("feature_adoption").$type<Record<string, number>>().default({}),
  lastLoginDate: timestamp("last_login_date", { mode: "string" }),
  monthlyActiveUsers: integer("monthly_active_users"),
  
  // Strategic information
  strategicValue: varchar("strategic_value", { length: 50 }), // low, medium, high, critical
  growthPotential: varchar("growth_potential", { length: 50 }), // low, medium, high
  competitiveThreats: jsonb("competitive_threats").$type<string[]>().default([]),
  renewalProbability: real("renewal_probability"), // 0-1
  
  // Timeline and milestones
  keyMilestones: jsonb("key_milestones").$type<Array<{
    date: string;
    event: string;
    impact: string;
  }>>().default([]),
  
  upcomingActions: jsonb("upcoming_actions").$type<Array<{
    date: string;
    action: string;
    owner: string;
    priority: string;
  }>>().default([]),
  
  // Context summary (AI-generated)
  executiveSummary: text("executive_summary"),
  contextLastUpdated: timestamp("context_last_updated", { mode: "string" }).defaultNow(),
  
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  orgIdx: uniqueIndex("unified_context_org_idx").on(table.organizationId),
  healthScoreIdx: index("unified_context_health_idx").on(table.overallHealthScore),
  stageIdx: index("unified_context_stage_idx").on(table.relationshipStage),
}));

// Define relations
export const organizationTechStackRelations = relations(organizationTechStack, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationTechStack.organizationId],
    references: [organizations.id],
  }),
}));

export const organizationIndustryIntelRelations = relations(organizationIndustryIntel, ({ one }) => ({
  organization: one(organizations, {
    fields: [organizationIndustryIntel.organizationId],
    references: [organizations.id],
  }),
}));

export const googleBusinessDataRelations = relations(googleBusinessData, ({ one }) => ({
  organization: one(organizations, {
    fields: [googleBusinessData.organizationId],
    references: [organizations.id],
  }),
}));

export const prospectIntelligenceRelations = relations(prospectIntelligence, ({ one }) => ({
  organization: one(organizations, {
    fields: [prospectIntelligence.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [prospectIntelligence.contactId],
    references: [contacts.id],
  }),
}));

export const unifiedClientContextRelations = relations(unifiedClientContext, ({ one }) => ({
  organization: one(organizations, {
    fields: [unifiedClientContext.organizationId],
    references: [organizations.id],
  }),
  primaryContact: one(contacts, {
    fields: [unifiedClientContext.primaryContact],
    references: [contacts.id],
  }),
  accountManager: one(users, {
    fields: [unifiedClientContext.accountManager],
    references: [users.id],
  }),
}));

// Type exports
export type OrganizationTechStack = InferSelectModel<typeof organizationTechStack>;
export type OrganizationTechStackInsert = InferInsertModel<typeof organizationTechStack>;

export type OrganizationIndustryIntel = InferSelectModel<typeof organizationIndustryIntel>;
export type OrganizationIndustryIntelInsert = InferInsertModel<typeof organizationIndustryIntel>;

export type GoogleBusinessData = InferSelectModel<typeof googleBusinessData>;
export type GoogleBusinessDataInsert = InferInsertModel<typeof googleBusinessData>;

export type ProspectIntelligence = InferSelectModel<typeof prospectIntelligence>;
export type ProspectIntelligenceInsert = InferInsertModel<typeof prospectIntelligence>;

export type UnifiedClientContext = InferSelectModel<typeof unifiedClientContext>;
export type UnifiedClientContextInsert = InferInsertModel<typeof unifiedClientContext>;