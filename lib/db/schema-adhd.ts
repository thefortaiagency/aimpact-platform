import { pgTable, uuid, varchar, text, integer, boolean, timestamp, date, real, jsonb, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './schema';

// ADHD Projects table
export const adhdProjects = pgTable('adhd_projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: varchar('name').notNull(),
  emoji: varchar('emoji'),
  priority: varchar('priority', { enum: ['critical', 'high', 'medium', 'low'] }).notNull().default('medium'),
  revenue: real('revenue'),
  deadline: timestamp('deadline'),
  isActive: boolean('is_active').default(true),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('adhd_projects_user_id_idx').on(table.userId),
  isActiveIdx: index('adhd_projects_is_active_idx').on(table.isActive),
}));

// ADHD Tasks table
export const adhdTasks = pgTable('adhd_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  projectId: uuid('project_id').references(() => adhdProjects.id),
  text: text('text').notNull(),
  priority: varchar('priority', { enum: ['critical', 'high', 'medium', 'low'] }).notNull().default('medium'),
  timeEstimate: integer('time_estimate').default(25), // minutes
  completed: boolean('completed').default(false),
  completedAt: timestamp('completed_at'),
  focusSessionsCount: integer('focus_sessions_count').default(0),
  tags: jsonb('tags').default([]),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('adhd_tasks_user_id_idx').on(table.userId),
  projectIdIdx: index('adhd_tasks_project_id_idx').on(table.projectId),
  completedIdx: index('adhd_tasks_completed_idx').on(table.completed),
  createdAtIdx: index('adhd_tasks_created_at_idx').on(table.createdAt),
}));

// ADHD Focus Sessions table
export const adhdFocusSessions = pgTable('adhd_focus_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  taskId: uuid('task_id').references(() => adhdTasks.id),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  duration: integer('duration'), // minutes
  interruptions: integer('interruptions').default(0),
  productivityScore: integer('productivity_score').default(8),
  notes: text('notes'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('adhd_focus_sessions_user_id_idx').on(table.userId),
  taskIdIdx: index('adhd_focus_sessions_task_id_idx').on(table.taskId),
  startTimeIdx: index('adhd_focus_sessions_start_time_idx').on(table.startTime),
}));

// ADHD Brain Dumps table
export const adhdBrainDumps = pgTable('adhd_brain_dumps', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  convertedToTask: boolean('converted_to_task').default(false),
  taskId: uuid('task_id').references(() => adhdTasks.id),
  tags: jsonb('tags').default([]),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  userIdIdx: index('adhd_brain_dumps_user_id_idx').on(table.userId),
  createdAtIdx: index('adhd_brain_dumps_created_at_idx').on(table.createdAt),
}));

// ADHD Daily Stats table
export const adhdDailyStats = pgTable('adhd_daily_stats', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  date: date('date').notNull(),
  tasksCompleted: integer('tasks_completed').default(0),
  totalFocusMinutes: integer('total_focus_minutes').default(0),
  focusSessionsCount: integer('focus_sessions_count').default(0),
  avgProductivityScore: real('avg_productivity_score'),
  interruptionsTotal: integer('interruptions_total').default(0),
  brainDumpsCount: integer('brain_dumps_count').default(0),
  streakCount: integer('streak_count').default(0),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  userDateUnique: uniqueIndex('adhd_daily_stats_unique_user_date').on(table.userId, table.date),
  userIdIdx: index('adhd_daily_stats_user_id_idx').on(table.userId),
  dateIdx: index('adhd_daily_stats_date_idx').on(table.date),
}));

// Relations
export const adhdProjectsRelations = relations(adhdProjects, ({ many }) => ({
  tasks: many(adhdTasks),
}));

export const adhdTasksRelations = relations(adhdTasks, ({ one, many }) => ({
  project: one(adhdProjects, {
    fields: [adhdTasks.projectId],
    references: [adhdProjects.id],
  }),
  focusSessions: many(adhdFocusSessions),
  brainDumpSource: one(adhdBrainDumps, {
    fields: [adhdTasks.id],
    references: [adhdBrainDumps.taskId],
  }),
}));

export const adhdFocusSessionsRelations = relations(adhdFocusSessions, ({ one }) => ({
  task: one(adhdTasks, {
    fields: [adhdFocusSessions.taskId],
    references: [adhdTasks.id],
  }),
}));

export const adhdBrainDumpsRelations = relations(adhdBrainDumps, ({ one }) => ({
  task: one(adhdTasks, {
    fields: [adhdBrainDumps.taskId],
    references: [adhdTasks.id],
  }),
}));

// Type exports for TypeScript
export type AdhdProject = typeof adhdProjects.$inferSelect;
export type NewAdhdProject = typeof adhdProjects.$inferInsert;

export type AdhdTask = typeof adhdTasks.$inferSelect;
export type NewAdhdTask = typeof adhdTasks.$inferInsert;

export type AdhdFocusSession = typeof adhdFocusSessions.$inferSelect;
export type NewAdhdFocusSession = typeof adhdFocusSessions.$inferInsert;

export type AdhdBrainDump = typeof adhdBrainDumps.$inferSelect;
export type NewAdhdBrainDump = typeof adhdBrainDumps.$inferInsert;

export type AdhdDailyStats = typeof adhdDailyStats.$inferSelect;
export type NewAdhdDailyStats = typeof adhdDailyStats.$inferInsert;