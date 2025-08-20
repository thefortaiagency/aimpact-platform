CREATE TABLE "ai_predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" text NOT NULL,
	"prediction_type" varchar(50) NOT NULL,
	"prediction" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"suggested_action" text,
	"suggested_priority" varchar(20),
	"acted_on" boolean DEFAULT false,
	"acted_by" uuid,
	"acted_at" timestamp,
	"outcome" varchar(50),
	"outcome_notes" text,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "email_ingestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" varchar(255),
	"from_email" varchar(255) NOT NULL,
	"to_email" varchar(255) NOT NULL,
	"subject" text,
	"body" text,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"ai_analysis" jsonb,
	"ticket_created" boolean DEFAULT false,
	"ticket_id" uuid,
	"auto_responded" boolean DEFAULT false,
	"response_content" text,
	"matched_solutions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "email_ingestion_message_id_unique" UNIQUE("message_id")
);
--> statement-breakpoint
CREATE TABLE "knowledge_base" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem" text NOT NULL,
	"problem_category" varchar(100),
	"problem_vector" text,
	"solution" text NOT NULL,
	"solution_steps" jsonb DEFAULT '[]'::jsonb,
	"ticket_ids" jsonb DEFAULT '[]'::jsonb,
	"project_ids" jsonb DEFAULT '[]'::jsonb,
	"success_rate" real DEFAULT 0,
	"usage_count" integer DEFAULT 0,
	"avg_resolution_time" integer,
	"ai_confidence" real DEFAULT 0.5,
	"human_verified" boolean DEFAULT false,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"related_solutions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"last_used_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "project_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"ticket_id" uuid NOT NULL,
	"added_at" timestamp DEFAULT now(),
	"added_by" uuid
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" text,
	"organization_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'planning' NOT NULL,
	"webpage_slug" varchar(100),
	"start_date" timestamp,
	"end_date" timestamp,
	"actual_end_date" timestamp,
	"budget" jsonb,
	"project_plan" jsonb,
	"ai_health_score" real,
	"predicted_completion_date" timestamp,
	"risk_factors" jsonb DEFAULT '[]'::jsonb,
	"completion_percentage" integer DEFAULT 0,
	"ticket_count" integer DEFAULT 0,
	"satisfaction_score" real,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "projects_webpage_slug_unique" UNIQUE("webpage_slug")
);
--> statement-breakpoint
ALTER TABLE "ai_predictions" ADD CONSTRAINT "ai_predictions_acted_by_users_id_fk" FOREIGN KEY ("acted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_ingestion" ADD CONSTRAINT "email_ingestion_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tickets" ADD CONSTRAINT "project_tickets_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tickets" ADD CONSTRAINT "project_tickets_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tickets" ADD CONSTRAINT "project_tickets_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_predictions_entity_idx" ON "ai_predictions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "ai_predictions_type_idx" ON "ai_predictions" USING btree ("prediction_type");--> statement-breakpoint
CREATE INDEX "ai_predictions_confidence_idx" ON "ai_predictions" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "ai_predictions_acted_idx" ON "ai_predictions" USING btree ("acted_on");--> statement-breakpoint
CREATE UNIQUE INDEX "email_ingestion_message_id_idx" ON "email_ingestion" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "email_ingestion_from_email_idx" ON "email_ingestion" USING btree ("from_email");--> statement-breakpoint
CREATE INDEX "email_ingestion_processed_idx" ON "email_ingestion" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "email_ingestion_ticket_idx" ON "email_ingestion" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "knowledge_base_category_idx" ON "knowledge_base" USING btree ("problem_category");--> statement-breakpoint
CREATE INDEX "knowledge_base_vector_idx" ON "knowledge_base" USING btree ("problem_vector");--> statement-breakpoint
CREATE INDEX "knowledge_base_confidence_idx" ON "knowledge_base" USING btree ("ai_confidence");--> statement-breakpoint
CREATE INDEX "project_tickets_project_idx" ON "project_tickets" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_tickets_ticket_idx" ON "project_tickets" USING btree ("ticket_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_idx" ON "projects" USING btree ("webpage_slug");--> statement-breakpoint
CREATE INDEX "projects_org_idx" ON "projects" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "projects_quote_idx" ON "projects" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "projects_status_idx" ON "projects" USING btree ("status");