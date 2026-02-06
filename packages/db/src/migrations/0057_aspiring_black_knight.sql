DROP INDEX "events_external_id_idx";--> statement-breakpoint
DROP INDEX "events_calendar_id_idx";--> statement-breakpoint
DROP INDEX "events_source_idx";--> statement-breakpoint
DROP INDEX "events_interval_idx";--> statement-breakpoint
DROP INDEX "events_goal_category_idx";--> statement-breakpoint
DROP INDEX "events_streak_count_idx";--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "status" SET DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "total_completions" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "last_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "expires_in_days" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "reminder_time" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_template" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "next_occurrence" timestamp;--> statement-breakpoint
CREATE INDEX "events_user_id_idx" ON "events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "events_date_idx" ON "events" USING btree ("date");--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "booking_reference";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "events" DROP COLUMN "url";