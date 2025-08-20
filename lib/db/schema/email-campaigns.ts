import { pgTable, uuid, varchar, text, boolean, timestamp, integer, decimal, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from '../schema';

// Email Lists (groups of contacts)
export const emailLists = pgTable('email_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Email Contacts with Opt-in/out Management
export const emailContacts = pgTable('email_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  company: varchar('company', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  
  // Opt-in/out management
  isSubscribed: boolean('is_subscribed').default(true),
  optedInAt: timestamp('opted_in_at', { withTimezone: true }),
  optedOutAt: timestamp('opted_out_at', { withTimezone: true }),
  optInMethod: varchar('opt_in_method', { length: 50 }), // 'import', 'signup', 'manual', 'api'
  optOutReason: text('opt_out_reason'),
  
  // Compliance fields
  consentGiven: boolean('consent_given').default(false),
  consentDate: timestamp('consent_date', { withTimezone: true }),
  consentIp: varchar('consent_ip', { length: 45 }),
  gdprConsent: boolean('gdpr_consent').default(false),
  
  // Engagement tracking
  lastEngagedAt: timestamp('last_engaged_at', { withTimezone: true }),
  engagementScore: integer('engagement_score').default(0),
  bounceCount: integer('bounce_count').default(0),
  isBounced: boolean('is_bounced').default(false),
  
  // Custom fields as JSON
  customFields: jsonb('custom_fields').default({}),
  tags: text('tags').array(),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  emailSubscribedIdx: index('idx_email_subscribed').on(table.email, table.isSubscribed),
  engagementIdx: index('idx_engagement').on(table.lastEngagedAt, table.engagementScore),
}));

// List Memberships (many-to-many)
export const listMemberships = pgTable('list_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  listId: uuid('list_id').references(() => emailLists.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => emailContacts.id, { onDelete: 'cascade' }),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
  status: varchar('status', { length: 20 }).default('active'), // 'active', 'unsubscribed', 'bounced'
});

// Email Campaigns
export const emailCampaigns = pgTable('email_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  previewText: varchar('preview_text', { length: 200 }),
  fromName: varchar('from_name', { length: 100 }).notNull(),
  fromEmail: varchar('from_email', { length: 255 }).notNull(),
  replyTo: varchar('reply_to', { length: 255 }),
  
  // Content
  htmlContent: text('html_content'),
  plainTextContent: text('plain_text_content'),
  templateId: uuid('template_id'),
  
  // Targeting
  listIds: uuid('list_ids').array(),
  segmentRules: jsonb('segment_rules'), // Dynamic segmentation rules
  
  // Scheduling
  status: varchar('status', { length: 20 }).default('draft'), // 'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  
  // Stats
  totalRecipients: integer('total_recipients').default(0),
  sentCount: integer('sent_count').default(0),
  deliveredCount: integer('delivered_count').default(0),
  openedCount: integer('opened_count').default(0),
  clickedCount: integer('clicked_count').default(0),
  unsubscribedCount: integer('unsubscribed_count').default(0),
  bouncedCount: integer('bounced_count').default(0),
  complainedCount: integer('complained_count').default(0),
  
  // Rates
  openRate: decimal('open_rate', { precision: 5, scale: 2 }),
  clickRate: decimal('click_rate', { precision: 5, scale: 2 }),
  bounceRate: decimal('bounce_rate', { precision: 5, scale: 2 }),
  unsubscribeRate: decimal('unsubscribe_rate', { precision: 5, scale: 2 }),
  
  // A/B Testing
  isAbTest: boolean('is_ab_test').default(false),
  abTestConfig: jsonb('ab_test_config'),
  winningVariant: varchar('winning_variant', { length: 10 }),
  
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  campaignStatusIdx: index('idx_campaign_status').on(table.status, table.scheduledAt),
  campaignDatesIdx: index('idx_campaign_dates').on(table.sentAt, table.createdAt),
}));

// Campaign Recipients (individual sends)
export const campaignRecipients = pgTable('campaign_recipients', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').references(() => emailContacts.id),
  email: varchar('email', { length: 255 }).notNull(),
  
  // Send status
  status: varchar('status', { length: 20 }).default('pending'), // 'pending', 'sent', 'delivered', 'bounced', 'failed'
  sentAt: timestamp('sent_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  bouncedAt: timestamp('bounced_at', { withTimezone: true }),
  failedAt: timestamp('failed_at', { withTimezone: true }),
  failureReason: text('failure_reason'),
  
  // Engagement tracking
  openedCount: integer('opened_count').default(0),
  firstOpenedAt: timestamp('first_opened_at', { withTimezone: true }),
  lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }),
  clickedCount: integer('clicked_count').default(0),
  firstClickedAt: timestamp('first_clicked_at', { withTimezone: true }),
  lastClickedAt: timestamp('last_clicked_at', { withTimezone: true }),
  
  // Actions
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  complainedAt: timestamp('complained_at', { withTimezone: true }),
  
  // Tracking
  trackingId: varchar('tracking_id', { length: 100 }).unique(),
  messageId: varchar('message_id', { length: 255 }), // Email service provider message ID
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  recipientCampaignIdx: index('idx_recipient_campaign').on(table.campaignId, table.status),
  recipientTrackingIdx: index('idx_recipient_tracking').on(table.trackingId),
  recipientEngagementIdx: index('idx_recipient_engagement').on(table.openedCount, table.clickedCount),
}));

// Email Opens Tracking
export const emailOpens = pgTable('email_opens', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientId: uuid('recipient_id').references(() => campaignRecipients.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  
  openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  deviceType: varchar('device_type', { length: 50 }), // 'desktop', 'mobile', 'tablet'
  clientType: varchar('client_type', { length: 100 }), // 'gmail', 'outlook', 'apple-mail', etc.
  location: jsonb('location'), // Geo-location data
}, (table) => ({
  opensRecipientIdx: index('idx_opens_recipient').on(table.recipientId, table.openedAt),
  opensCampaignIdx: index('idx_opens_campaign').on(table.campaignId, table.openedAt),
}));

// Email Clicks Tracking
export const emailClicks = pgTable('email_clicks', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientId: uuid('recipient_id').references(() => campaignRecipients.id, { onDelete: 'cascade' }),
  campaignId: uuid('campaign_id').references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  
  url: text('url').notNull(),
  clickedAt: timestamp('clicked_at', { withTimezone: true }).defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  deviceType: varchar('device_type', { length: 50 }),
  clientType: varchar('client_type', { length: 100 }),
  location: jsonb('location'),
}, (table) => ({
  clicksRecipientIdx: index('idx_clicks_recipient').on(table.recipientId, table.clickedAt),
  clicksCampaignIdx: index('idx_clicks_campaign').on(table.campaignId, table.clickedAt),
  clicksUrlIdx: index('idx_clicks_url').on(table.url, table.clickedAt),
}));

// Email Templates
export const emailTemplates = pgTable('email_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  subject: varchar('subject', { length: 500 }),
  previewText: varchar('preview_text', { length: 200 }),
  htmlContent: text('html_content').notNull(),
  plainTextContent: text('plain_text_content'),
  thumbnailUrl: text('thumbnail_url'),
  
  // Variables/merge tags used in template
  variables: jsonb('variables').default([]),
  
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Unsubscribe Reasons
export const unsubscribeReasons = pgTable('unsubscribe_reasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => emailContacts.id),
  campaignId: uuid('campaign_id').references(() => emailCampaigns.id),
  reason: text('reason'),
  feedback: text('feedback'),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }).defaultNow(),
});

// Suppression List (global do-not-email)
export const suppressionList = pgTable('suppression_list', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  reason: varchar('reason', { length: 50 }), // 'unsubscribed', 'bounced', 'complained', 'manual'
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
  addedBy: uuid('added_by').references(() => users.id),
  notes: text('notes'),
});

// Relations
export const emailListsRelations = relations(emailLists, ({ many }) => ({
  memberships: many(listMemberships),
}));

export const emailContactsRelations = relations(emailContacts, ({ many }) => ({
  memberships: many(listMemberships),
  recipients: many(campaignRecipients),
  unsubscribeReasons: many(unsubscribeReasons),
}));

export const emailCampaignsRelations = relations(emailCampaigns, ({ many, one }) => ({
  recipients: many(campaignRecipients),
  opens: many(emailOpens),
  clicks: many(emailClicks),
  unsubscribeReasons: many(unsubscribeReasons),
  creator: one(users, {
    fields: [emailCampaigns.createdBy],
    references: [users.id],
  }),
}));

export const campaignRecipientsRelations = relations(campaignRecipients, ({ one, many }) => ({
  campaign: one(emailCampaigns, {
    fields: [campaignRecipients.campaignId],
    references: [emailCampaigns.id],
  }),
  contact: one(emailContacts, {
    fields: [campaignRecipients.contactId],
    references: [emailContacts.id],
  }),
  opens: many(emailOpens),
  clicks: many(emailClicks),
}));