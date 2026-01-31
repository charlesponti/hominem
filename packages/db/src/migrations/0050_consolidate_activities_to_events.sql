-- Add new event_type enum values for activities
ALTER TYPE "public"."event_type" ADD VALUE 'Habit' BEFORE 'Transactions';
ALTER TYPE "public"."event_type" ADD VALUE 'Goal' BEFORE 'Transactions';
ALTER TYPE "public"."event_type" ADD VALUE 'Recurring' BEFORE 'Transactions';
ALTER TYPE "public"."event_type" ADD VALUE 'Travel' BEFORE 'Transactions';

-- Add activity/habit tracking fields to events table
ALTER TABLE "events" ADD COLUMN "interval" text;
ALTER TABLE "events" ADD COLUMN "recurrence_rule" text;
ALTER TABLE "events" ADD COLUMN "score" integer;
ALTER TABLE "events" ADD COLUMN "priority" integer;
ALTER TABLE "events" ADD COLUMN "is_completed" boolean DEFAULT false;
ALTER TABLE "events" ADD COLUMN "streak_count" integer DEFAULT 0;
ALTER TABLE "events" ADD COLUMN "completed_instances" integer DEFAULT 0;
ALTER TABLE "events" ADD COLUMN "target_value" integer;
ALTER TABLE "events" ADD COLUMN "current_value" integer DEFAULT 0;
ALTER TABLE "events" ADD COLUMN "unit" text;
ALTER TABLE "events" ADD COLUMN "reminder_settings" jsonb;
ALTER TABLE "events" ADD COLUMN "dependencies" jsonb;
ALTER TABLE "events" ADD COLUMN "resources" jsonb;
ALTER TABLE "events" ADD COLUMN "milestones" jsonb;
ALTER TABLE "events" ADD COLUMN "goal_category" text;
ALTER TABLE "events" ADD COLUMN "parent_event_id" uuid;

-- Add travel/booking fields to events table
ALTER TABLE "events" ADD COLUMN "booking_reference" text;
ALTER TABLE "events" ADD COLUMN "price" text;
ALTER TABLE "events" ADD COLUMN "url" text;

-- Add foreign key for parent_event_id
ALTER TABLE "events" ADD CONSTRAINT "events_parent_event_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "events"("id") ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX "events_type_idx" ON "events"("type");
CREATE INDEX "events_interval_idx" ON "events"("interval");
CREATE INDEX "events_goal_category_idx" ON "events"("goal_category");
CREATE INDEX "events_streak_count_idx" ON "events"("streak_count");
