ALTER TABLE "activities" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "activity" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "activities" CASCADE;--> statement-breakpoint
DROP TABLE "activity" CASCADE;--> statement-breakpoint
-- Add new event_type enum values for activities and habits
ALTER TYPE "public"."event_type" ADD VALUE 'Habit';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'Goal';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'Recurring';--> statement-breakpoint
ALTER TYPE "public"."event_type" ADD VALUE 'Travel';--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "interval" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "recurrence_rule" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "priority" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "is_completed" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "streak_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "completed_instances" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "target_value" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "current_value" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "unit" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "reminder_settings" json;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "dependencies" json;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "resources" json;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "milestones" json;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "goal_category" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "parent_event_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "booking_reference" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "price" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_parent_event_id_events_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_type_idx" ON "events" USING btree ("type");--> statement-breakpoint
CREATE INDEX "events_interval_idx" ON "events" USING btree ("interval");--> statement-breakpoint
CREATE INDEX "events_goal_category_idx" ON "events" USING btree ("goal_category");--> statement-breakpoint
CREATE INDEX "events_streak_count_idx" ON "events" USING btree ("streak_count");