import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';
import {
  pgTable,
  varchar,
  timestamp,
  json,
  uuid,
  text,
  primaryKey,
  foreignKey,
  boolean,
  jsonb,
  integer,
  serial
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  password: varchar('password', { length: 64 }),
});

export type User = InferSelectModel<typeof user>;

export const chat = pgTable('Chat', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  createdAt: timestamp('createdAt').notNull(),
  title: text('title').notNull(),
  userId: uuid('userId')
    .notNull()
    .references(() => user.id),
  visibility: varchar('visibility', { enum: ['public', 'private'] })
    .notNull()
    .default('private'),
});

export type Chat = InferSelectModel<typeof chat>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://github.com/vercel/ai-chatbot/blob/main/docs/04-migrate-to-parts.md
export const messageDeprecated = pgTable('Message', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  content: json('content').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type MessageDeprecated = InferSelectModel<typeof messageDeprecated>;

export const message = pgTable('Message_v2', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  chatId: uuid('chatId')
    .notNull()
    .references(() => chat.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  attachments: json('attachments').notNull(),
  createdAt: timestamp('createdAt').notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

// DEPRECATED: The following schema is deprecated and will be removed in the future.
// Read the migration guide at https://github.com/vercel/ai-chatbot/blob/main/docs/04-migrate-to-parts.md
export const voteDeprecated = pgTable(
  'Vote',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => messageDeprecated.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type VoteDeprecated = InferSelectModel<typeof voteDeprecated>;

export const vote = pgTable(
  'Vote_v2',
  {
    chatId: uuid('chatId')
      .notNull()
      .references(() => chat.id),
    messageId: uuid('messageId')
      .notNull()
      .references(() => message.id),
    isUpvoted: boolean('isUpvoted').notNull(),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.chatId, table.messageId] }),
    };
  },
);

export type Vote = InferSelectModel<typeof vote>;

export const document = pgTable(
  'Document',
  {
    id: uuid('id').notNull().defaultRandom(),
    createdAt: timestamp('createdAt').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
      .notNull()
      .default('text'),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.id, table.createdAt] }),
    };
  },
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  'Suggestion',
  {
    id: uuid('id').notNull().defaultRandom(),
    documentId: uuid('documentId').notNull(),
    documentCreatedAt: timestamp('documentCreatedAt').notNull(),
    originalText: text('originalText').notNull(),
    suggestedText: text('suggestedText').notNull(),
    description: text('description'),
    isResolved: boolean('isResolved').notNull().default(false),
    userId: uuid('userId')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
  }),
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  'Streams',
  {
    id: uuid('id').notNull().defaultRandom(),
    chatId: uuid('chatId').notNull(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;


// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  firstName: text("firstName"),
  lastName: text("lastName"),
  email: text("email").unique(),
  handle: text("handle").unique(),
  bio: text("bio"),
  image: text("image"),
  banner: text("banner"), // <-- ADD THIS LINE
  password: text("password"),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow(),
  userRole: text("userRole"), // <-- ADDED THIS LINE
});

// Types for users
export type User1 = InferSelectModel<typeof users>;
export type User1Insert = InferInsertModel<typeof users>;

// Posts table (tweets)
export const posts = pgTable("Post", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content"),
  imageUrl: text("imageUrl"),
  media: jsonb("media"),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow(),
});

// Types for posts
export type Post = InferSelectModel<typeof posts>;
export type PostInsert = InferInsertModel<typeof posts>;

// Likes table
export const likes = pgTable("Like", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("postId")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
});

export type Like = InferSelectModel<typeof likes>;
export type LikeInsert = InferInsertModel<typeof likes>;

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, { fields: [likes.userId], references: [users.id] }),
  post: one(posts, { fields: [likes.postId], references: [posts.id] }),
}));


// Comments table
export const comments = pgTable("Comment", {
  id: uuid("id").primaryKey().defaultRandom(),
  content: text("content"),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("postId")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow(),
})

export type Comment = InferSelectModel<typeof comments>;
export type CommentInsert = InferInsertModel<typeof comments>;

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
}))


// schema.ts
export const bookmarks = pgTable(
  "bookmarks", // LOWERCASE, to match Postgres
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.postId] }),
  })
)

export type Bookmark = InferSelectModel<typeof bookmarks>
export type BookmarkInsert = InferInsertModel<typeof bookmarks>


// schema.ts
export const bookmarks1 = pgTable("Bookmark", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  postId: uuid("postId").notNull().references(() => posts.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow(),
})
export type Bookmark1 = InferSelectModel<typeof bookmarks>
export type BookmarkInsert1 = InferInsertModel<typeof bookmarks>


// Training Categories Table
export const trainingCategories = pgTable("training_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Training Sessions Table
export const trainingSessions = pgTable("training_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  startTime: varchar("start_time", { length: 8 }).notNull(), // HH:MM:SS format
  endTime: varchar("end_time", { length: 8 }).notNull(), // HH:MM:SS format
  instructor: varchar("instructor", { length: 255 }).notNull(),
  categoryId: uuid("category_id").references(() => trainingCategories.id),
  location: varchar("location", { length: 255 }),
  agenda: jsonb("agenda"),
  maxParticipants: integer("max_participants"),
  currentParticipants: integer("current_participants").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// User Training Enrollments Table
export const userTrainingEnrollments = pgTable("user_training_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  trainingId: uuid("training_id")
    .references(() => trainingSessions.id)
    .notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  status: varchar("status", { length: 50 }).default("enrolled"),
})

// Define relations
export const trainingSessionsRelations = relations(trainingSessions, ({ one, many }) => ({
  category: one(trainingCategories, {
    fields: [trainingSessions.categoryId],
    references: [trainingCategories.id],
  }),
  enrollments: many(userTrainingEnrollments),
}))

export const userTrainingEnrollmentsRelations = relations(userTrainingEnrollments, ({ one }) => ({
  trainingSession: one(trainingSessions, {
    fields: [userTrainingEnrollments.trainingId],
    references: [trainingSessions.id],
  }),
}))

export type TrainingCategory = InferSelectModel<typeof trainingCategories>
export type TrainingSession = InferSelectModel<typeof trainingSessions>
export type UserTrainingEnrollment = InferSelectModel<typeof userTrainingEnrollments>


export type NewTrainingCategory = InferInsertModel<typeof trainingCategories>
export type NewTrainingSession = InferInsertModel<typeof trainingSessions>
export type NewUserTrainingEnrollment = InferInsertModel<typeof userTrainingEnrollments>


// News table
export const news = pgTable("news", {
  id: uuid("id").primaryKey().defaultRandom(),
  newsTitle: text("news_title").notNull(),
  newsUrl: text("news_url").notNull().unique(),
  imageUrl: text("image_url"),
  summary: text("summary"),
  source: varchar("source", { length: 100 }), // e.g., "themat.com"
  publishedAt: timestamp("published_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow(),
  displayCode: text("display_code"),
});

// Types for news
export type News = InferSelectModel<typeof news>;
export type NewsInsert = InferInsertModel<typeof news>;

// Content Spots table
export const contentSpots = pgTable("content_spots", {
  id: serial("id").primaryKey(),
  spotType: varchar("spot_type", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  maxItems: integer("max_items").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

// Content Spot Items table
export const contentSpotItems = pgTable("content_spot_items", {
  id: serial("id").primaryKey(),
  spotType: varchar("spot_type", { length: 64 }).notNull(),
  itemIndex: integer("item_index").notNull(),
  title: text("title"),
  description: text("description"),
  buttonText: text("button_text"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
});

export type ContentSpot = {
  id: number;
  spot_type: string;
  name: string;
  max_items: number;
  created_at: string;
  updated_at: string;
  items?: ContentSpotItem[];
};

export type ContentSpotItem = {
  id: number;
  spot_type: string;
  item_index: number;
  title: string | null;
  description: string | null;
  button_text: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};


export const bugReports = pgTable("bug_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  description: text("description").notNull(),
  priority: varchar("priority", { enum: ["low", "medium", "high"] }).notNull(),
  tags: jsonb("tags").notNull(),
  createdBy: text("created_by"),
  screenshotUrl: text("screenshot_url"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});

export type BugReport = InferSelectModel<typeof bugReports>;
export type BugReportInsert = InferInsertModel<typeof bugReports>;


export const bugs = pgTable("bugs", {
  id: uuid("id").primaryKey().defaultRandom(),
  description: text("description").notNull(),
  priority: varchar("priority", { enum: ["low", "medium", "high"] }).notNull(),
  tags: jsonb("tags").notNull(),
  createdBy: text("created_by"),
  screenshotUrl: text("screenshot_url"),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow(),
});
// Export quote schemas
export * from './schema/quotes';

// Export email campaign schemas
export * from './schema/email-campaigns';
