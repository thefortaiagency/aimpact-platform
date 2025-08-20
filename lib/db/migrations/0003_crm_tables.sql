-- Create enums for CRM
CREATE TYPE "public"."deal_stage" AS ENUM('prospecting', 'qualification', 'proposal', 'negotiation', 'closed-won', 'closed-lost');
CREATE TYPE "public"."activity_type" AS ENUM('call', 'email', 'meeting', 'task', 'note');
CREATE TYPE "public"."lifecycle_stage" AS ENUM('lead', 'marketing-qualified', 'sales-qualified', 'opportunity', 'customer', 'evangelist');

-- Deals table
CREATE TABLE "deals" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(255) NOT NULL,
    "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
    "contact_id" uuid REFERENCES "contacts"("id") ON DELETE SET NULL,
    "value" numeric(15, 2) NOT NULL,
    "stage" "deal_stage" NOT NULL DEFAULT 'prospecting',
    "probability" integer NOT NULL DEFAULT 0,
    "expected_close_date" timestamp NOT NULL,
    "actual_close_date" timestamp,
    "owner" uuid NOT NULL REFERENCES "users"("id"),
    "description" text,
    "lost_reason" text,
    "competitor_name" varchar(255),
    "tags" jsonb DEFAULT '[]'::jsonb,
    "custom_fields" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "created_by" uuid REFERENCES "users"("id")
);

-- Activities table
CREATE TABLE "activities" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "type" "activity_type" NOT NULL,
    "subject" varchar(255) NOT NULL,
    "description" text,
    "organization_id" uuid REFERENCES "organizations"("id") ON DELETE CASCADE,
    "contact_id" uuid REFERENCES "contacts"("id") ON DELETE SET NULL,
    "deal_id" uuid REFERENCES "deals"("id") ON DELETE CASCADE,
    "due_date" timestamp,
    "completed_at" timestamp,
    "completed" boolean DEFAULT false,
    "assigned_to" uuid REFERENCES "users"("id"),
    "location" text,
    "attendees" jsonb DEFAULT '[]'::jsonb,
    "outcome" text,
    "next_steps" text,
    "tags" jsonb DEFAULT '[]'::jsonb,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    "created_by" uuid REFERENCES "users"("id")
);

-- Lead Scores table
CREATE TABLE "lead_scores" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "contact_id" uuid UNIQUE NOT NULL REFERENCES "contacts"("id") ON DELETE CASCADE,
    "demographic_score" integer DEFAULT 0,
    "behavioral_score" integer DEFAULT 0,
    "engagement_score" integer DEFAULT 0,
    "total_score" integer DEFAULT 0,
    "score_factors" jsonb DEFAULT '{}'::jsonb,
    "lifecycle_stage" "lifecycle_stage" DEFAULT 'lead',
    "last_calculated_at" timestamp DEFAULT now(),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Account Health Scores table
CREATE TABLE "account_health_scores" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "organization_id" uuid UNIQUE NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "engagement_score" integer DEFAULT 0,
    "satisfaction_score" integer DEFAULT 0,
    "revenue_score" integer DEFAULT 0,
    "support_score" integer DEFAULT 0,
    "overall_score" integer DEFAULT 0,
    "churn_risk" varchar(10) DEFAULT 'low' CHECK ("churn_risk" IN ('low', 'medium', 'high')),
    "expansion_potential" varchar(10) DEFAULT 'medium' CHECK ("expansion_potential" IN ('low', 'medium', 'high')),
    "health_metrics" jsonb DEFAULT '{}'::jsonb,
    "account_value" numeric(15, 2),
    "renewal_date" timestamp,
    "last_calculated_at" timestamp DEFAULT now(),
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);

-- Create indexes for deals
CREATE INDEX "deals_org_idx" ON "deals" ("organization_id");
CREATE INDEX "deals_contact_idx" ON "deals" ("contact_id");
CREATE INDEX "deals_stage_idx" ON "deals" ("stage");
CREATE INDEX "deals_owner_idx" ON "deals" ("owner");
CREATE INDEX "deals_expected_close_date_idx" ON "deals" ("expected_close_date");

-- Create indexes for activities
CREATE INDEX "activities_type_idx" ON "activities" ("type");
CREATE INDEX "activities_org_idx" ON "activities" ("organization_id");
CREATE INDEX "activities_contact_idx" ON "activities" ("contact_id");
CREATE INDEX "activities_deal_idx" ON "activities" ("deal_id");
CREATE INDEX "activities_due_date_idx" ON "activities" ("due_date");
CREATE INDEX "activities_completed_idx" ON "activities" ("completed");
CREATE INDEX "activities_assigned_to_idx" ON "activities" ("assigned_to");

-- Create indexes for lead scores
CREATE UNIQUE INDEX "lead_scores_contact_idx" ON "lead_scores" ("contact_id");
CREATE INDEX "lead_scores_total_score_idx" ON "lead_scores" ("total_score");
CREATE INDEX "lead_scores_lifecycle_stage_idx" ON "lead_scores" ("lifecycle_stage");

-- Create indexes for account health scores
CREATE UNIQUE INDEX "account_health_scores_org_idx" ON "account_health_scores" ("organization_id");
CREATE INDEX "account_health_scores_overall_score_idx" ON "account_health_scores" ("overall_score");
CREATE INDEX "account_health_scores_churn_risk_idx" ON "account_health_scores" ("churn_risk");

-- Add lifecycle and lead score columns to contacts if they don't exist
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "lifecycle_stage" "lifecycle_stage" DEFAULT 'lead';
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "lead_score" integer DEFAULT 0;

-- Add health score and account value to organizations if they don't exist
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "health_score" integer DEFAULT 85;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "account_value" numeric(15, 2) DEFAULT 0;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "renewal_date" timestamp;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "size" varchar(50);
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "revenue" varchar(50);