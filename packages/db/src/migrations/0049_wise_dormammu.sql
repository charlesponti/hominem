CREATE TYPE "public"."interview_format" AS ENUM('Phone', 'VideoCall', 'OnSite', 'TakeHomeAssignment', 'Other');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'PendingFeedback');--> statement-breakpoint
CREATE TYPE "public"."interview_type" AS ENUM('PhoneScreen', 'Technical', 'Behavioral', 'Panel', 'CaseStudy', 'Final', 'Informational', 'Other');--> statement-breakpoint
CREATE TYPE "public"."job_skill_importance" AS ENUM('Required', 'Preferred', 'Optional', 'NiceToHave');--> statement-breakpoint
CREATE TYPE "public"."skill_category" AS ENUM('Technical', 'Soft', 'Language', 'Tool', 'Framework', 'Other');--> statement-breakpoint
CREATE TYPE "public"."skill_proficiency" AS ENUM('Beginner', 'Intermediate', 'Advanced', 'Expert');--> statement-breakpoint
CREATE TABLE "interview_interviewers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"interview_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"role" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"job_application_id" uuid NOT NULL,
	"company_id" uuid,
	"type" "interview_type" NOT NULL,
	"format" "interview_format" NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"duration_minutes" integer,
	"location" text,
	"notes" text,
	"feedback" text,
	"thank_you_note_sent_at" timestamp,
	"status" "interview_status",
	"questions_asked" jsonb,
	"questions_to_ask" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "networking_event_attendees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"networking_event_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"notes" text,
	"followed_up" boolean DEFAULT false,
	"follow_up_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "networking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "event_type",
	"date" timestamp NOT NULL,
	"location" text,
	"organizer" text,
	"website" text,
	"notes" text,
	"key_takeaways" text,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"importance_level" "job_skill_importance",
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "skill_category",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "user_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"proficiency_level" "skill_proficiency",
	"years_of_experience" integer,
	"last_used_date" timestamp,
	"is_verified" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "list" RENAME COLUMN "userId" TO "ownerId";--> statement-breakpoint
ALTER TABLE "list" DROP CONSTRAINT "list_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "plaid_transaction_id" text;--> statement-breakpoint
ALTER TABLE "interview_interviewers" ADD CONSTRAINT "interview_interviewers_interview_id_interviews_id_fk" FOREIGN KEY ("interview_id") REFERENCES "public"."interviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_interviewers" ADD CONSTRAINT "interview_interviewers_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_job_application_id_job_applications_id_fk" FOREIGN KEY ("job_application_id") REFERENCES "public"."job_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_event_attendees" ADD CONSTRAINT "networking_event_attendees_networking_event_id_networking_events_id_fk" FOREIGN KEY ("networking_event_id") REFERENCES "public"."networking_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_event_attendees" ADD CONSTRAINT "networking_event_attendees_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "networking_events" ADD CONSTRAINT "networking_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_skills" ADD CONSTRAINT "job_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_skills" ADD CONSTRAINT "user_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "interview_interviewer_unique_idx" ON "interview_interviewers" USING btree ("interview_id","contact_id");--> statement-breakpoint
CREATE INDEX "ii_interview_id_idx" ON "interview_interviewers" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "ii_contact_id_idx" ON "interview_interviewers" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "interview_user_id_idx" ON "interviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interview_job_app_id_idx" ON "interviews" USING btree ("job_application_id");--> statement-breakpoint
CREATE INDEX "interview_company_id_idx" ON "interviews" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "interview_scheduled_at_idx" ON "interviews" USING btree ("scheduled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ne_attendee_unique_idx" ON "networking_event_attendees" USING btree ("networking_event_id","contact_id");--> statement-breakpoint
CREATE INDEX "nea_event_id_idx" ON "networking_event_attendees" USING btree ("networking_event_id");--> statement-breakpoint
CREATE INDEX "nea_contact_id_idx" ON "networking_event_attendees" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "ne_user_id_idx" ON "networking_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ne_date_idx" ON "networking_events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "ne_type_idx" ON "networking_events" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "job_skill_unique_idx" ON "job_skills" USING btree ("job_id","skill_id");--> statement-breakpoint
CREATE INDEX "job_skill_job_id_idx" ON "job_skills" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "job_skill_skill_id_idx" ON "job_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_skill_unique_idx" ON "user_skills" USING btree ("user_id","skill_id");--> statement-breakpoint
CREATE INDEX "user_skill_user_id_idx" ON "user_skills" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_skill_skill_id_idx" ON "user_skills" USING btree ("skill_id");--> statement-breakpoint
ALTER TABLE "list" ADD CONSTRAINT "list_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "transactions_user_id_idx" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_date_idx" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "transactions_account_id_idx" ON "transactions" USING btree ("account_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_plaid_transaction_id_unique" UNIQUE("plaid_transaction_id");