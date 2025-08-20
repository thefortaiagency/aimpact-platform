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
import { organizations, contacts } from "./schema-communications";

// Enums
export const dealStageEnum = pgEnum('deal_stage', [
  'prospecting',
  'qualification', 
  'proposal',
  'negotiation',
  'closed-won',
  'closed-lost'
]);

export const activityTypeEnum = pgEnum('activity_type', [
  'call',
  'email',
  'meeting',
  'task',
  'note'
]);

export const lifecycleStageEnum = pgEnum('lifecycle_stage', [
  'lead',
  'marketing-qualified',
  'sales-qualified',
  'opportunity',
  'customer',
  'evangelist'
]);

// Deals table
export const deals = pgTable("deals", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  value: numeric("value", { precision: 15, scale: 2 }).notNull(),
  stage: dealStageEnum("stage").notNull().default('prospecting'),
  probability: integer("probability").notNull().default(0), // 0-100
  expectedCloseDate: timestamp("expected_close_date", { mode: "string" }).notNull(),
  actualCloseDate: timestamp("actual_close_date", { mode: "string" }),
  owner: uuid("owner").references(() => users.id).notNull(),
  
  // Additional fields
  description: text("description"),
  lostReason: text("lost_reason"),
  competitorName: varchar("competitor_name", { length: 255 }),
  tags: jsonb("tags").$type<string[]>().default([]),
  customFields: jsonb("custom_fields").$type<Record<string, any>>().default({}),
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (table) => ({
  orgIdx: index("deals_org_idx").on(table.organizationId),
  contactIdx: index("deals_contact_idx").on(table.contactId),
  stageIdx: index("deals_stage_idx").on(table.stage),
  ownerIdx: index("deals_owner_idx").on(table.owner),
  expectedCloseDateIdx: index("deals_expected_close_date_idx").on(table.expectedCloseDate),
}));

// Activities table
export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: activityTypeEnum("type").notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description"),
  
  // Related entities
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
  
  // Activity details
  dueDate: timestamp("due_date", { mode: "string" }),
  completedAt: timestamp("completed_at", { mode: "string" }),
  completed: boolean("completed").default(false),
  
  // Assignment
  assignedTo: uuid("assigned_to").references(() => users.id),
  
  // Additional fields
  location: text("location"),
  attendees: jsonb("attendees").$type<string[]>().default([]),
  outcome: text("outcome"),
  nextSteps: text("next_steps"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (table) => ({
  typeIdx: index("activities_type_idx").on(table.type),
  orgIdx: index("activities_org_idx").on(table.organizationId),
  contactIdx: index("activities_contact_idx").on(table.contactId),
  dealIdx: index("activities_deal_idx").on(table.dealId),
  dueDateIdx: index("activities_due_date_idx").on(table.dueDate),
  completedIdx: index("activities_completed_idx").on(table.completed),
  assignedToIdx: index("activities_assigned_to_idx").on(table.assignedTo),
}));

// Lead Scoring table
export const leadScores = pgTable("lead_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }).unique(),
  
  // Scoring components
  demographicScore: integer("demographic_score").default(0), // 0-100
  behavioralScore: integer("behavioral_score").default(0), // 0-100
  engagementScore: integer("engagement_score").default(0), // 0-100
  totalScore: integer("total_score").default(0), // 0-100
  
  // Scoring factors
  scoreFactors: jsonb("score_factors").$type<{
    emailOpens?: number;
    emailClicks?: number;
    websiteVisits?: number;
    contentDownloads?: number;
    socialEngagement?: number;
    meetingsScheduled?: number;
    proposalsViewed?: number;
  }>().default({}),
  
  // Lifecycle
  lifecycleStage: lifecycleStageEnum("lifecycle_stage").default('lead'),
  
  // Timestamps
  lastCalculatedAt: timestamp("last_calculated_at", { mode: "string" }).defaultNow(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  contactIdx: uniqueIndex("lead_scores_contact_idx").on(table.contactId),
  totalScoreIdx: index("lead_scores_total_score_idx").on(table.totalScore),
  lifecycleStageIdx: index("lead_scores_lifecycle_stage_idx").on(table.lifecycleStage),
}));

// Account Health Scores table
export const accountHealthScores = pgTable("account_health_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }).unique(),
  
  // Health score components
  engagementScore: integer("engagement_score").default(0), // 0-100
  satisfactionScore: integer("satisfaction_score").default(0), // 0-100
  revenueScore: integer("revenue_score").default(0), // 0-100
  supportScore: integer("support_score").default(0), // 0-100
  overallScore: integer("overall_score").default(0), // 0-100
  
  // Risk indicators
  churnRisk: varchar("churn_risk", { enum: ['low', 'medium', 'high'] }).default('low'),
  expansionPotential: varchar("expansion_potential", { enum: ['low', 'medium', 'high'] }).default('medium'),
  
  // Metrics
  healthMetrics: jsonb("health_metrics").$type<{
    lastContactDays?: number;
    openTickets?: number;
    avgResponseTime?: number;
    npsScore?: number;
    usageFrequency?: number;
    featureAdoption?: number;
    paymentDelinquency?: boolean;
  }>().default({}),
  
  // Account details
  accountValue: numeric("account_value", { precision: 15, scale: 2 }),
  renewalDate: timestamp("renewal_date", { mode: "string" }),
  
  // Timestamps
  lastCalculatedAt: timestamp("last_calculated_at", { mode: "string" }).defaultNow(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  orgIdx: uniqueIndex("account_health_scores_org_idx").on(table.organizationId),
  overallScoreIdx: index("account_health_scores_overall_score_idx").on(table.overallScore),
  churnRiskIdx: index("account_health_scores_churn_risk_idx").on(table.churnRisk),
}));

// Define relations
export const dealsRelations = relations(deals, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [deals.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [deals.contactId],
    references: [contacts.id],
  }),
  owner: one(users, {
    fields: [deals.owner],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [deals.createdBy],
    references: [users.id],
  }),
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  organization: one(organizations, {
    fields: [activities.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [activities.contactId],
    references: [contacts.id],
  }),
  deal: one(deals, {
    fields: [activities.dealId],
    references: [deals.id],
  }),
  assignedUser: one(users, {
    fields: [activities.assignedTo],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [activities.createdBy],
    references: [users.id],
  }),
}));

export const leadScoresRelations = relations(leadScores, ({ one }) => ({
  contact: one(contacts, {
    fields: [leadScores.contactId],
    references: [contacts.id],
  }),
}));

export const accountHealthScoresRelations = relations(accountHealthScores, ({ one }) => ({
  organization: one(organizations, {
    fields: [accountHealthScores.organizationId],
    references: [organizations.id],
  }),
}));

// Type exports
export type Deal = InferSelectModel<typeof deals>;
export type DealInsert = InferInsertModel<typeof deals>;

export type Activity = InferSelectModel<typeof activities>;
export type ActivityInsert = InferInsertModel<typeof activities>;

export type LeadScore = InferSelectModel<typeof leadScores>;
export type LeadScoreInsert = InferInsertModel<typeof leadScores>;

export type AccountHealthScore = InferSelectModel<typeof accountHealthScores>;
export type AccountHealthScoreInsert = InferInsertModel<typeof accountHealthScores>;