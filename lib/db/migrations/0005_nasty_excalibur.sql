ALTER TABLE "quotes" ADD COLUMN "closed_at" timestamp;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "closure_notes" text;--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "closure_reason" text;