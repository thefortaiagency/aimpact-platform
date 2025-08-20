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

// Enums
export const communicationTypeEnum = pgEnum('communication_type', ['email', 'phone', 'sms', 'chat', 'social']);
export const communicationDirectionEnum = pgEnum('communication_direction', ['inbound', 'outbound']);
export const sentimentEnum = pgEnum('sentiment', ['positive', 'neutral', 'negative']);
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'in_progress', 'waiting', 'resolved', 'closed']);
export const ticketPriorityEnum = pgEnum('ticket_priority', ['low', 'medium', 'high', 'urgent']);

// Organizations/Clients table
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  domain: varchar("domain", { length: 255 }).unique(),
  industry: varchar("industry", { length: 100 }),
  website: varchar("website", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  logoUrl: text("logo_url"),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (table) => ({
  domainIdx: index("organizations_domain_idx").on(table.domain),
  nameIdx: index("organizations_name_idx").on(table.name),
}));

// Contacts table (people within organizations)
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  position: varchar("position", { length: 100 }),
  department: varchar("department", { length: 100 }),
  isPrimary: boolean("is_primary").default(false),
  avatarUrl: text("avatar_url"),
  timezone: varchar("timezone", { length: 50 }),
  preferredChannel: communicationTypeEnum("preferred_channel").default('email'),
  notes: text("notes"),
  tags: jsonb("tags").$type<string[]>().default([]),
  socialProfiles: jsonb("social_profiles").$type<Record<string, string>>().default({}),
  lastContactedAt: timestamp("last_contacted_at", { mode: "string" }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (table) => ({
  emailIdx: index("contacts_email_idx").on(table.email),
  orgIdx: index("contacts_org_idx").on(table.organizationId),
  phoneIdx: index("contacts_phone_idx").on(table.phone),
}));

// Communications table (all interactions)
export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  type: communicationTypeEnum("type").notNull(),
  direction: communicationDirectionEnum("direction").notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  htmlContent: text("html_content"),
  summary: text("summary"), // AI-generated summary
  
  // Communication details
  fromAddress: varchar("from_address", { length: 255 }),
  toAddress: varchar("to_address", { length: 255 }),
  ccAddresses: jsonb("cc_addresses").$type<string[]>().default([]),
  bccAddresses: jsonb("bcc_addresses").$type<string[]>().default([]),
  phoneNumber: varchar("phone_number", { length: 50 }),
  duration: integer("duration"), // in seconds for calls
  
  // Metadata
  messageId: varchar("message_id", { length: 255 }), // External ID (email message ID, call SID, etc.)
  threadId: varchar("thread_id", { length: 255 }), // For grouping related communications
  attachments: jsonb("attachments").$type<Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>>().default([]),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  
  // Sentiment and AI analysis
  sentiment: sentimentEnum("sentiment"),
  sentimentScore: real("sentiment_score"), // -1 to 1
  keywords: jsonb("keywords").$type<string[]>().default([]),
  entities: jsonb("entities").$type<Array<{
    type: string;
    value: string;
    confidence: number;
  }>>().default([]),
  aiInsights: jsonb("ai_insights").$type<{
    category?: string;
    intent?: string;
    suggestedActions?: string[];
    riskLevel?: string;
  }>(),
  
  // Status and assignment
  isRead: boolean("is_read").default(false),
  isArchived: boolean("is_archived").default(false),
  isFlagged: boolean("is_flagged").default(false),
  assignedTo: uuid("assigned_to").references(() => users.id),
  
  // Timestamps
  communicatedAt: timestamp("communicated_at", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  orgIdx: index("communications_org_idx").on(table.organizationId),
  contactIdx: index("communications_contact_idx").on(table.contactId),
  typeIdx: index("communications_type_idx").on(table.type),
  sentimentIdx: index("communications_sentiment_idx").on(table.sentiment),
  communicatedAtIdx: index("communications_communicated_at_idx").on(table.communicatedAt),
  threadIdx: index("communications_thread_idx").on(table.threadId),
  messageIdIdx: uniqueIndex("communications_message_id_idx").on(table.messageId),
}));

// Support Tickets table
export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketNumber: varchar("ticket_number", { length: 20 }).notNull().unique(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  
  // Ticket details
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").default('open').notNull(),
  priority: ticketPriorityEnum("priority").default('medium').notNull(),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  
  // Assignment and SLA
  assignedTo: uuid("assigned_to").references(() => users.id),
  assignedAt: timestamp("assigned_at", { mode: "string" }),
  slaResponseTime: integer("sla_response_time"), // in minutes
  slaResolutionTime: integer("sla_resolution_time"), // in hours
  firstResponseAt: timestamp("first_response_at", { mode: "string" }),
  resolvedAt: timestamp("resolved_at", { mode: "string" }),
  closedAt: timestamp("closed_at", { mode: "string" }),
  
  // Related communications
  sourceCommunicationId: uuid("source_communication_id").references(() => communications.id),
  
  // Metadata
  tags: jsonb("tags").$type<string[]>().default([]),
  customFields: jsonb("custom_fields").$type<Record<string, any>>().default({}),
  internalNotes: text("internal_notes"),
  
  // Satisfaction
  satisfactionRating: integer("satisfaction_rating"), // 1-5
  satisfactionComment: text("satisfaction_comment"),
  
  // Timestamps
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  createdBy: uuid("created_by").references(() => users.id),
}, (table) => ({
  ticketNumberIdx: uniqueIndex("tickets_number_idx").on(table.ticketNumber),
  orgIdx: index("tickets_org_idx").on(table.organizationId),
  statusIdx: index("tickets_status_idx").on(table.status),
  priorityIdx: index("tickets_priority_idx").on(table.priority),
  assignedToIdx: index("tickets_assigned_to_idx").on(table.assignedTo),
}));

// Ticket Communications (link tickets to communications)
export const ticketCommunications = pgTable("ticket_communications", {
  ticketId: uuid("ticket_id").notNull().references(() => tickets.id, { onDelete: "cascade" }),
  communicationId: uuid("communication_id").notNull().references(() => communications.id, { onDelete: "cascade" }),
  isInternal: boolean("is_internal").default(false),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.ticketId, table.communicationId] }),
  ticketIdx: index("ticket_communications_ticket_idx").on(table.ticketId),
  commIdx: index("ticket_communications_comm_idx").on(table.communicationId),
}));

// Phone Numbers table (for tracking all phone numbers)
export const phoneNumbers = pgTable("phone_numbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  phoneNumber: varchar("phone_number", { length: 50 }).notNull().unique(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }), // mobile, office, home, etc.
  isPrimary: boolean("is_primary").default(false),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at", { mode: "string" }),
  lastUsedAt: timestamp("last_used_at", { mode: "string" }),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  phoneIdx: uniqueIndex("phone_numbers_phone_idx").on(table.phoneNumber),
  orgIdx: index("phone_numbers_org_idx").on(table.organizationId),
}));

// Email Addresses table (for tracking all email addresses)
export const emailAddresses = pgTable("email_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  emailAddress: varchar("email_address", { length: 255 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }).notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }), // work, personal, etc.
  isPrimary: boolean("is_primary").default(false),
  isVerified: boolean("is_verified").default(false),
  verifiedAt: timestamp("verified_at", { mode: "string" }),
  lastUsedAt: timestamp("last_used_at", { mode: "string" }),
  bounceCount: integer("bounce_count").default(0),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("email_addresses_email_idx").on(table.emailAddress),
  domainIdx: index("email_addresses_domain_idx").on(table.domain),
  orgIdx: index("email_addresses_org_idx").on(table.organizationId),
}));

// Communication Analytics table (aggregated data)
export const communicationAnalytics = pgTable("communication_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
  
  // Time period
  periodType: varchar("period_type", { length: 20 }).notNull(), // daily, weekly, monthly
  periodStart: timestamp("period_start", { mode: "string" }).notNull(),
  periodEnd: timestamp("period_end", { mode: "string" }).notNull(),
  
  // Metrics
  totalCommunications: integer("total_communications").default(0),
  emailCount: integer("email_count").default(0),
  phoneCount: integer("phone_count").default(0),
  smsCount: integer("sms_count").default(0),
  chatCount: integer("chat_count").default(0),
  
  // Sentiment metrics
  avgSentimentScore: real("avg_sentiment_score"),
  positiveSentimentCount: integer("positive_sentiment_count").default(0),
  neutralSentimentCount: integer("neutral_sentiment_count").default(0),
  negativeSentimentCount: integer("negative_sentiment_count").default(0),
  
  // Response metrics
  avgResponseTime: integer("avg_response_time"), // in minutes
  avgResolutionTime: integer("avg_resolution_time"), // in hours
  firstContactResolutionRate: real("first_contact_resolution_rate"),
  
  // Engagement metrics
  engagementScore: real("engagement_score"),
  topKeywords: jsonb("top_keywords").$type<string[]>().default([]),
  topEntities: jsonb("top_entities").$type<string[]>().default([]),
  
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
}, (table) => ({
  orgPeriodIdx: index("analytics_org_period_idx").on(table.organizationId, table.periodType, table.periodStart),
  contactPeriodIdx: index("analytics_contact_period_idx").on(table.contactId, table.periodType, table.periodStart),
}));

// Define relations
export const organizationsRelations = relations(organizations, ({ many, one }) => ({
  contacts: many(contacts),
  communications: many(communications),
  tickets: many(tickets),
  phoneNumbers: many(phoneNumbers),
  emailAddresses: many(emailAddresses),
  analytics: many(communicationAnalytics),
  createdByUser: one(users, {
    fields: [organizations.createdBy],
    references: [users.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [contacts.organizationId],
    references: [organizations.id],
  }),
  communications: many(communications),
  tickets: many(tickets),
  phoneNumbers: many(phoneNumbers),
  emailAddresses: many(emailAddresses),
  analytics: many(communicationAnalytics),
  createdByUser: one(users, {
    fields: [contacts.createdBy],
    references: [users.id],
  }),
}));

export const communicationsRelations = relations(communications, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [communications.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [communications.contactId],
    references: [contacts.id],
  }),
  assignedUser: one(users, {
    fields: [communications.assignedTo],
    references: [users.id],
  }),
  ticketCommunications: many(ticketCommunications),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [tickets.organizationId],
    references: [organizations.id],
  }),
  contact: one(contacts, {
    fields: [tickets.contactId],
    references: [contacts.id],
  }),
  assignedUser: one(users, {
    fields: [tickets.assignedTo],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [tickets.createdBy],
    references: [users.id],
  }),
  sourceCommunication: one(communications, {
    fields: [tickets.sourceCommunicationId],
    references: [communications.id],
  }),
  ticketCommunications: many(ticketCommunications),
}));

export const ticketCommunicationsRelations = relations(ticketCommunications, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketCommunications.ticketId],
    references: [tickets.id],
  }),
  communication: one(communications, {
    fields: [ticketCommunications.communicationId],
    references: [communications.id],
  }),
}));

// Type exports
export type Organization = InferSelectModel<typeof organizations>;
export type OrganizationInsert = InferInsertModel<typeof organizations>;

export type Contact = InferSelectModel<typeof contacts>;
export type ContactInsert = InferInsertModel<typeof contacts>;

export type Communication = InferSelectModel<typeof communications>;
export type CommunicationInsert = InferInsertModel<typeof communications>;

export type Ticket = InferSelectModel<typeof tickets>;
export type TicketInsert = InferInsertModel<typeof tickets>;

export type PhoneNumber = InferSelectModel<typeof phoneNumbers>;
export type PhoneNumberInsert = InferInsertModel<typeof phoneNumbers>;

export type EmailAddress = InferSelectModel<typeof emailAddresses>;
export type EmailAddressInsert = InferInsertModel<typeof emailAddresses>;

export type CommunicationAnalytics = InferSelectModel<typeof communicationAnalytics>;
export type CommunicationAnalyticsInsert = InferInsertModel<typeof communicationAnalytics>;