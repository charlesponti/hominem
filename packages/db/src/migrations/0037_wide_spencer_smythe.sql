ALTER TABLE "contacts" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "interview_interviewers" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "interviews" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "networking_event_attendees" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "networking_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "job_skills" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "skills" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_skills" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "contacts" CASCADE;--> statement-breakpoint
DROP TABLE "interview_interviewers" CASCADE;--> statement-breakpoint
DROP TABLE "interviews" CASCADE;--> statement-breakpoint
DROP TABLE "networking_event_attendees" CASCADE;--> statement-breakpoint
DROP TABLE "networking_events" CASCADE;--> statement-breakpoint
DROP TABLE "job_skills" CASCADE;--> statement-breakpoint
DROP TABLE "skills" CASCADE;--> statement-breakpoint
DROP TABLE "user_skills" CASCADE;--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."event_type";--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('Transactions', 'Events', 'Birthdays', 'Anniversaries', 'Dates', 'Messages', 'Photos', 'Relationship Start', 'Relationship End', 'Sex', 'Movies', 'Reading');--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "type" SET DATA TYPE "public"."event_type" USING "type"::"public"."event_type";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "supabase_id" SET NOT NULL;--> statement-breakpoint
DROP TYPE "public"."contact_source";--> statement-breakpoint
DROP TYPE "public"."interview_format";--> statement-breakpoint
DROP TYPE "public"."interview_status";--> statement-breakpoint
DROP TYPE "public"."interview_type";--> statement-breakpoint
DROP TYPE "public"."job_skill_importance";--> statement-breakpoint
DROP TYPE "public"."skill_category";--> statement-breakpoint
DROP TYPE "public"."skill_proficiency";