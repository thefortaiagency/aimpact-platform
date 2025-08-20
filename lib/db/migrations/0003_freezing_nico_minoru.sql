CREATE TABLE "adhd_brain_dumps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"converted_to_task" boolean DEFAULT false,
	"task_id" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "adhd_daily_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"tasks_completed" integer DEFAULT 0,
	"total_focus_minutes" integer DEFAULT 0,
	"focus_sessions_count" integer DEFAULT 0,
	"avg_productivity_score" real,
	"interruptions_total" integer DEFAULT 0,
	"brain_dumps_count" integer DEFAULT 0,
	"streak_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "adhd_focus_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"task_id" uuid,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"interruptions" integer DEFAULT 0,
	"productivity_score" integer DEFAULT 8,
	"notes" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "adhd_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar NOT NULL,
	"emoji" varchar,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"revenue" real,
	"deadline" timestamp,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "adhd_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"project_id" uuid,
	"text" text NOT NULL,
	"priority" varchar DEFAULT 'medium' NOT NULL,
	"time_estimate" integer DEFAULT 25,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"focus_sessions_count" integer DEFAULT 0,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "adhd_brain_dumps" ADD CONSTRAINT "adhd_brain_dumps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adhd_brain_dumps" ADD CONSTRAINT "adhd_brain_dumps_task_id_adhd_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."adhd_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adhd_daily_stats" ADD CONSTRAINT "adhd_daily_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adhd_focus_sessions" ADD CONSTRAINT "adhd_focus_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adhd_focus_sessions" ADD CONSTRAINT "adhd_focus_sessions_task_id_adhd_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."adhd_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adhd_projects" ADD CONSTRAINT "adhd_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adhd_tasks" ADD CONSTRAINT "adhd_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adhd_tasks" ADD CONSTRAINT "adhd_tasks_project_id_adhd_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."adhd_projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adhd_brain_dumps_user_id_idx" ON "adhd_brain_dumps" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "adhd_brain_dumps_created_at_idx" ON "adhd_brain_dumps" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "adhd_daily_stats_unique_user_date" ON "adhd_daily_stats" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "adhd_daily_stats_user_id_idx" ON "adhd_daily_stats" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "adhd_daily_stats_date_idx" ON "adhd_daily_stats" USING btree ("date");--> statement-breakpoint
CREATE INDEX "adhd_focus_sessions_user_id_idx" ON "adhd_focus_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "adhd_focus_sessions_task_id_idx" ON "adhd_focus_sessions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "adhd_focus_sessions_start_time_idx" ON "adhd_focus_sessions" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "adhd_projects_user_id_idx" ON "adhd_projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "adhd_projects_is_active_idx" ON "adhd_projects" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "adhd_tasks_user_id_idx" ON "adhd_tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "adhd_tasks_project_id_idx" ON "adhd_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "adhd_tasks_completed_idx" ON "adhd_tasks" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "adhd_tasks_created_at_idx" ON "adhd_tasks" USING btree ("created_at");