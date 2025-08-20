CREATE TABLE "bugs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"priority" varchar NOT NULL,
	"tags" jsonb NOT NULL,
	"created_by" text,
	"screenshot_url" text,
	"created_at" timestamp DEFAULT now()
);
