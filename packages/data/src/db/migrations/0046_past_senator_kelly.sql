DROP TABLE "place_visits" CASCADE;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "visit_notes" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "visit_rating" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "visit_review" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "visit_people" text;