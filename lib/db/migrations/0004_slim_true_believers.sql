CREATE TABLE "quote_signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" text NOT NULL,
	"signer_name" text NOT NULL,
	"signer_email" text NOT NULL,
	"signer_title" text,
	"signature_image" text NOT NULL,
	"signed_at" timestamp NOT NULL,
	"ip_address" text NOT NULL,
	"user_agent" text,
	"document_hash" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" text NOT NULL,
	"viewed_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"duration" numeric(10, 2)
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"client_name" text NOT NULL,
	"client_email" text NOT NULL,
	"client_company" text,
	"project_name" text NOT NULL,
	"amount_min" numeric(10, 2) NOT NULL,
	"amount_max" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"valid_until" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"signed_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "quote_signatures" ADD CONSTRAINT "quote_signatures_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_views" ADD CONSTRAINT "quote_views_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;