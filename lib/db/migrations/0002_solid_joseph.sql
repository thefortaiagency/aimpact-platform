CREATE TYPE "public"."communication_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."communication_type" AS ENUM('email', 'phone', 'sms', 'chat', 'social');--> statement-breakpoint
CREATE TYPE "public"."sentiment" AS ENUM('positive', 'neutral', 'negative');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'in_progress', 'waiting', 'resolved', 'closed');--> statement-breakpoint
CREATE TABLE "communication_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"period_type" varchar(20) NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_communications" integer DEFAULT 0,
	"email_count" integer DEFAULT 0,
	"phone_count" integer DEFAULT 0,
	"sms_count" integer DEFAULT 0,
	"chat_count" integer DEFAULT 0,
	"avg_sentiment_score" real,
	"positive_sentiment_count" integer DEFAULT 0,
	"neutral_sentiment_count" integer DEFAULT 0,
	"negative_sentiment_count" integer DEFAULT 0,
	"avg_response_time" integer,
	"avg_resolution_time" integer,
	"first_contact_resolution_rate" real,
	"engagement_score" real,
	"top_keywords" jsonb DEFAULT '[]'::jsonb,
	"top_entities" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"type" "communication_type" NOT NULL,
	"direction" "communication_direction" NOT NULL,
	"subject" text,
	"content" text NOT NULL,
	"html_content" text,
	"summary" text,
	"from_address" varchar(255),
	"to_address" varchar(255),
	"cc_addresses" jsonb DEFAULT '[]'::jsonb,
	"bcc_addresses" jsonb DEFAULT '[]'::jsonb,
	"phone_number" varchar(50),
	"duration" integer,
	"message_id" varchar(255),
	"thread_id" varchar(255),
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"sentiment" "sentiment",
	"sentiment_score" real,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"entities" jsonb DEFAULT '[]'::jsonb,
	"ai_insights" jsonb,
	"is_read" boolean DEFAULT false,
	"is_archived" boolean DEFAULT false,
	"is_flagged" boolean DEFAULT false,
	"assigned_to" uuid,
	"communicated_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"position" varchar(100),
	"department" varchar(100),
	"is_primary" boolean DEFAULT false,
	"avatar_url" text,
	"timezone" varchar(50),
	"preferred_channel" "communication_type" DEFAULT 'email',
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"social_profiles" jsonb DEFAULT '{}'::jsonb,
	"last_contacted_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "email_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_address" varchar(255) NOT NULL,
	"domain" varchar(255) NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"type" varchar(50),
	"is_primary" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"last_used_at" timestamp,
	"bounce_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_addresses_email_address_unique" UNIQUE("email_address")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"domain" varchar(255),
	"industry" varchar(100),
	"website" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"logo_url" text,
	"notes" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "organizations_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "phone_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone_number" varchar(50) NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"type" varchar(50),
	"is_primary" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"last_used_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "phone_numbers_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "ticket_communications" (
	"ticket_id" uuid NOT NULL,
	"communication_id" uuid NOT NULL,
	"is_internal" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ticket_communications_ticket_id_communication_id_pk" PRIMARY KEY("ticket_id","communication_id")
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_number" varchar(20) NOT NULL,
	"organization_id" uuid,
	"contact_id" uuid,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"category" varchar(100),
	"subcategory" varchar(100),
	"assigned_to" uuid,
	"assigned_at" timestamp,
	"sla_response_time" integer,
	"sla_resolution_time" integer,
	"first_response_at" timestamp,
	"resolved_at" timestamp,
	"closed_at" timestamp,
	"source_communication_id" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"custom_fields" jsonb DEFAULT '{}'::jsonb,
	"internal_notes" text,
	"satisfaction_rating" integer,
	"satisfaction_comment" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" uuid,
	CONSTRAINT "tickets_ticket_number_unique" UNIQUE("ticket_number")
);
--> statement-breakpoint
ALTER TABLE "communication_analytics" ADD CONSTRAINT "communication_analytics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communication_analytics" ADD CONSTRAINT "communication_analytics_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_addresses" ADD CONSTRAINT "email_addresses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_addresses" ADD CONSTRAINT "email_addresses_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phone_numbers" ADD CONSTRAINT "phone_numbers_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_communications" ADD CONSTRAINT "ticket_communications_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_communications" ADD CONSTRAINT "ticket_communications_communication_id_communications_id_fk" FOREIGN KEY ("communication_id") REFERENCES "public"."communications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_source_communication_id_communications_id_fk" FOREIGN KEY ("source_communication_id") REFERENCES "public"."communications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analytics_org_period_idx" ON "communication_analytics" USING btree ("organization_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "analytics_contact_period_idx" ON "communication_analytics" USING btree ("contact_id","period_type","period_start");--> statement-breakpoint
CREATE INDEX "communications_org_idx" ON "communications" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "communications_contact_idx" ON "communications" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "communications_type_idx" ON "communications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "communications_sentiment_idx" ON "communications" USING btree ("sentiment");--> statement-breakpoint
CREATE INDEX "communications_communicated_at_idx" ON "communications" USING btree ("communicated_at");--> statement-breakpoint
CREATE INDEX "communications_thread_idx" ON "communications" USING btree ("thread_id");--> statement-breakpoint
CREATE UNIQUE INDEX "communications_message_id_idx" ON "communications" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "contacts_email_idx" ON "contacts" USING btree ("email");--> statement-breakpoint
CREATE INDEX "contacts_org_idx" ON "contacts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "contacts_phone_idx" ON "contacts" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "email_addresses_email_idx" ON "email_addresses" USING btree ("email_address");--> statement-breakpoint
CREATE INDEX "email_addresses_domain_idx" ON "email_addresses" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "email_addresses_org_idx" ON "email_addresses" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "organizations_domain_idx" ON "organizations" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "organizations_name_idx" ON "organizations" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "phone_numbers_phone_idx" ON "phone_numbers" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "phone_numbers_org_idx" ON "phone_numbers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ticket_communications_ticket_idx" ON "ticket_communications" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_communications_comm_idx" ON "ticket_communications" USING btree ("communication_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_number_idx" ON "tickets" USING btree ("ticket_number");--> statement-breakpoint
CREATE INDEX "tickets_org_idx" ON "tickets" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_assigned_to_idx" ON "tickets" USING btree ("assigned_to");