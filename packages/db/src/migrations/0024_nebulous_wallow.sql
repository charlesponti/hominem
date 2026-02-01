CREATE TABLE "content_strategies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"strategy" json NOT NULL,
	"userId" uuid NOT NULL,
	"createdAt" timestamp(3) DEFAULT now() NOT NULL,
	"updatedAt" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "application_notes" CASCADE;--> statement-breakpoint
ALTER TABLE "job_applications" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "content_strategies" ADD CONSTRAINT "content_strategies_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;