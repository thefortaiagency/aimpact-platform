import { pgTable, text, timestamp, uuid, jsonb, real, integer, boolean, varchar, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { quotes } from './schema/quotes';
import { organizations, contacts, tickets } from './schema-communications';
import { users } from './schema';

// Projects table - links to quotes when won
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: text('quote_id').references(() => quotes.id), // Links to winning quote!
  organizationId: uuid('organization_id').references(() => organizations.id),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('planning').notNull(), // planning, active, on-hold, completed, cancelled
  webpageSlug: varchar('webpage_slug', { length: 100 }).unique(), // For /projects/[slug]
  
  // Timeline from quote
  startDate: timestamp('start_date', { mode: 'string' }),
  endDate: timestamp('end_date', { mode: 'string' }),
  actualEndDate: timestamp('actual_end_date', { mode: 'string' }),
  
  // Budget from quote
  budget: jsonb('budget').$type<{
    quoted: number;
    actual: number;
    remaining: number;
  }>(),
  
  // Project plan with tasks
  projectPlan: jsonb('project_plan').$type<{
    phases: Array<{
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      status: 'pending' | 'active' | 'completed';
      tasks: Array<{
        id: string;
        title: string;
        description: string;
        assignee?: string;
        dueDate?: string;
        completed: boolean;
        aiGenerated?: boolean;
      }>;
    }>;
  }>(),
  
  // AI Monitoring
  aiHealthScore: real('ai_health_score'), // 0-100
  predictedCompletionDate: timestamp('predicted_completion_date', { mode: 'string' }),
  riskFactors: jsonb('risk_factors').$type<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestedAction: string;
  }>>().default([]),
  
  // Metrics
  completionPercentage: integer('completion_percentage').default(0),
  ticketCount: integer('ticket_count').default(0),
  satisfactionScore: real('satisfaction_score'),
  
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
  createdBy: uuid('created_by').references(() => users.id),
}, (table) => ({
  slugIdx: uniqueIndex('projects_slug_idx').on(table.webpageSlug),
  orgIdx: index('projects_org_idx').on(table.organizationId),
  quoteIdx: index('projects_quote_idx').on(table.quoteId),
  statusIdx: index('projects_status_idx').on(table.status),
}));

// Link tickets to projects
export const projectTickets = pgTable('project_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  ticketId: uuid('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  addedAt: timestamp('added_at', { mode: 'string' }).defaultNow(),
  addedBy: uuid('added_by').references(() => users.id),
}, (table) => ({
  projectIdx: index('project_tickets_project_idx').on(table.projectId),
  ticketIdx: index('project_tickets_ticket_idx').on(table.ticketId),
}));

// Knowledge Base - learns from resolved tickets
export const knowledgeBase = pgTable('knowledge_base', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Problem identification
  problem: text('problem').notNull(),
  problemCategory: varchar('problem_category', { length: 100 }),
  problemVector: text('problem_vector'), // Pinecone vector ID
  
  // Solution
  solution: text('solution').notNull(),
  solutionSteps: jsonb('solution_steps').$type<string[]>().default([]),
  
  // Learning metrics
  ticketIds: jsonb('ticket_ids').$type<string[]>().default([]),
  projectIds: jsonb('project_ids').$type<string[]>().default([]),
  successRate: real('success_rate').default(0), // 0-1
  usageCount: integer('usage_count').default(0),
  avgResolutionTime: integer('avg_resolution_time'), // in minutes
  
  // AI confidence
  aiConfidence: real('ai_confidence').default(0.5), // 0-1
  humanVerified: boolean('human_verified').default(false),
  
  // Metadata
  tags: jsonb('tags').$type<string[]>().default([]),
  relatedSolutions: jsonb('related_solutions').$type<string[]>().default([]),
  
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  lastUsedAt: timestamp('last_used_at', { mode: 'string' }),
  updatedAt: timestamp('updated_at', { mode: 'string' }).defaultNow(),
}, (table) => ({
  categoryIdx: index('knowledge_base_category_idx').on(table.problemCategory),
  vectorIdx: index('knowledge_base_vector_idx').on(table.problemVector),
  confidenceIdx: index('knowledge_base_confidence_idx').on(table.aiConfidence),
}));

// AI Predictions - proactive insights
export const aiPredictions = pgTable('ai_predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // What we're predicting about
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'project', 'contact', 'organization', 'ticket'
  entityId: text('entity_id').notNull(),
  
  // The prediction
  predictionType: varchar('prediction_type', { length: 50 }).notNull(), // 'delay', 'churn', 'upsell', 'issue', 'satisfaction'
  prediction: jsonb('prediction').$type<any>().notNull(),
  confidence: real('confidence').notNull(), // 0-1
  
  // Suggested action
  suggestedAction: text('suggested_action'),
  suggestedPriority: varchar('suggested_priority', { length: 20 }), // 'low', 'medium', 'high', 'urgent'
  
  // Tracking
  actedOn: boolean('acted_on').default(false),
  actedBy: uuid('acted_by').references(() => users.id),
  actedAt: timestamp('acted_at', { mode: 'string' }),
  outcome: varchar('outcome', { length: 50 }), // 'success', 'failure', 'partial', 'pending'
  outcomeNotes: text('outcome_notes'),
  
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
  expiresAt: timestamp('expires_at', { mode: 'string' }),
}, (table) => ({
  entityIdx: index('ai_predictions_entity_idx').on(table.entityType, table.entityId),
  typeIdx: index('ai_predictions_type_idx').on(table.predictionType),
  confidenceIdx: index('ai_predictions_confidence_idx').on(table.confidence),
  actedIdx: index('ai_predictions_acted_idx').on(table.actedOn),
}));

// Email Ingestion Log - track auto-processing
export const emailIngestion = pgTable('email_ingestion', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Email details
  messageId: varchar('message_id', { length: 255 }).unique(),
  fromEmail: varchar('from_email', { length: 255 }).notNull(),
  toEmail: varchar('to_email', { length: 255 }).notNull(),
  subject: text('subject'),
  body: text('body'),
  
  // Processing results
  processed: boolean('processed').default(false),
  processedAt: timestamp('processed_at', { mode: 'string' }),
  aiAnalysis: jsonb('ai_analysis').$type<{
    category: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    urgency: 'low' | 'medium' | 'high';
    suggestedActions: string[];
    detectedClient?: string;
    detectedProject?: string;
    confidence: number;
  }>(),
  
  // Actions taken
  ticketCreated: boolean('ticket_created').default(false),
  ticketId: uuid('ticket_id').references(() => tickets.id),
  autoResponded: boolean('auto_responded').default(false),
  responseContent: text('response_content'),
  
  // Knowledge base matching
  matchedSolutions: jsonb('matched_solutions').$type<Array<{
    knowledgeBaseId: string;
    confidence: number;
    solution: string;
  }>>().default([]),
  
  createdAt: timestamp('created_at', { mode: 'string' }).defaultNow(),
}, (table) => ({
  messageIdIdx: uniqueIndex('email_ingestion_message_id_idx').on(table.messageId),
  fromEmailIdx: index('email_ingestion_from_email_idx').on(table.fromEmail),
  processedIdx: index('email_ingestion_processed_idx').on(table.processed),
  ticketIdx: index('email_ingestion_ticket_idx').on(table.ticketId),
}));

// Type exports
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectTicket = typeof projectTickets.$inferSelect;
export type NewProjectTicket = typeof projectTickets.$inferInsert;
export type KnowledgeBaseEntry = typeof knowledgeBase.$inferSelect;
export type NewKnowledgeBaseEntry = typeof knowledgeBase.$inferInsert;
export type AIPrediction = typeof aiPredictions.$inferSelect;
export type NewAIPrediction = typeof aiPredictions.$inferInsert;
export type EmailIngestionLog = typeof emailIngestion.$inferSelect;
export type NewEmailIngestionLog = typeof emailIngestion.$inferInsert;