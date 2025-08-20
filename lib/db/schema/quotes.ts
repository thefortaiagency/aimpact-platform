import { pgTable, text, timestamp, decimal, jsonb, uuid } from 'drizzle-orm/pg-core';

export const quotes = pgTable('quotes', {
  id: text('id').primaryKey(), // e.g., '2025-001'
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  clientCompany: text('client_company'),
  projectName: text('project_name').notNull(),
  amountMin: decimal('amount_min', { precision: 10, scale: 2 }).notNull(),
  amountMax: decimal('amount_max', { precision: 10, scale: 2 }).notNull(),
  status: text('status', { 
    enum: ['draft', 'sent', 'viewed', 'signed', 'expired', 'rejected', 'won', 'lost'] 
  }).default('draft').notNull(),
  validUntil: timestamp('valid_until').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
  viewedAt: timestamp('viewed_at'),
  signedAt: timestamp('signed_at'),
  closedAt: timestamp('closed_at'),
  closureNotes: text('closure_notes'),
  closureReason: text('closure_reason', {
    enum: ['accepted', 'price', 'timing', 'competitor', 'no_response', 'other']
  }),
  metadata: jsonb('metadata').$type<{
    preparedBy?: string;
    preparedByTitle?: string;
    preparedByEmail?: string;
    terms?: string[];
    features?: Array<{
      name: string;
      description: string;
      price: number;
      timeline: string;
    }>;
  }>(),
});

export const quoteSignatures = pgTable('quote_signatures', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: text('quote_id').references(() => quotes.id).notNull(),
  signerName: text('signer_name').notNull(),
  signerEmail: text('signer_email').notNull(),
  signerTitle: text('signer_title'),
  signatureImage: text('signature_image').notNull(), // Base64 encoded
  signedAt: timestamp('signed_at').notNull(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent'),
  documentHash: text('document_hash'), // SHA256 of the document at signing time
  metadata: jsonb('metadata').$type<{
    agreeTerms?: boolean;
    acceptDeposit?: boolean;
    customTerms?: string[];
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const quoteViews = pgTable('quote_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  quoteId: text('quote_id').references(() => quotes.id).notNull(),
  viewedAt: timestamp('viewed_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  duration: decimal('duration', { precision: 10, scale: 2 }), // seconds spent viewing
});

// Type exports
export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export type QuoteSignature = typeof quoteSignatures.$inferSelect;
export type NewQuoteSignature = typeof quoteSignatures.$inferInsert;
export type QuoteView = typeof quoteViews.$inferSelect;