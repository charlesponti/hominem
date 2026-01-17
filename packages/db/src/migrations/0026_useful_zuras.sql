CREATE TYPE "public"."application_stage_name" AS ENUM('Applied', 'Screening', 'Assessment', 'Interview', 'TechnicalTest', 'Offer', 'Hired', 'Rejected', 'Withdrew', 'OnHold');--> statement-breakpoint
CREATE TYPE "public"."application_stage_status" AS ENUM('Pending', 'Scheduled', 'InProgress', 'Completed', 'Skipped', 'Failed', 'Passed');--> statement-breakpoint
CREATE TYPE "public"."job_application_status" AS ENUM('Applied', 'Hired', 'Withdrew', 'Rejected', 'Offer', 'Screening', 'Interviewing', 'Pending');--> statement-breakpoint
CREATE TYPE "public"."job_posting_status" AS ENUM('draft', 'open', 'closed', 'filled', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('resume', 'coverLetter', 'sample', 'other');--> statement-breakpoint
CREATE TABLE "application_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_application_id" uuid NOT NULL,
	"stage" "application_stage_name" NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"notes" text,
	"status" "application_stage_status",
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_experiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text NOT NULL,
	"role" text NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"image" text,
	"location" text,
	"tags" json DEFAULT '[]'::json,
	"achievements" json DEFAULT '[]'::json,
	"metadata" json,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_applications" RENAME COLUMN "resume" TO "resume_document_url";--> statement-breakpoint
ALTER TABLE "job_applications" RENAME COLUMN "cover_letter" TO "cover_letter_document_url";--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "status" SET DEFAULT 'Applied'::"public"."job_application_status";--> statement-breakpoint
ALTER TABLE "job_applications" ALTER COLUMN "status" SET DATA TYPE "public"."job_application_status" USING "status"::"public"."job_application_status";--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "requirements" SET DATA TYPE json;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "requirements" SET DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "salary" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "location" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."job_posting_status";--> statement-breakpoint
ALTER TABLE "jobs" ALTER COLUMN "status" SET DATA TYPE "public"."job_posting_status" USING "status"::"public"."job_posting_status";--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "location" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "type" SET DATA TYPE "public"."document_type" USING "type"::"public"."document_type";--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "currency" text DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "benefits" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "user_id" uuid;--> statement-breakpoint
ALTER TABLE "application_stages" ADD CONSTRAINT "application_stages_job_application_id_job_applications_id_fk" FOREIGN KEY ("job_application_id") REFERENCES "public"."job_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_experiences" ADD CONSTRAINT "work_experiences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_stage_job_app_id_idx" ON "application_stages" USING btree ("job_application_id");--> statement-breakpoint
CREATE INDEX "work_exp_user_id_idx" ON "work_experiences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "work_exp_company_id_idx" ON "work_experiences" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "work_exp_sort_order_idx" ON "work_experiences" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "work_exp_visible_idx" ON "work_experiences" USING btree ("is_visible");--> statement-breakpoint
CREATE INDEX "work_exp_created_at_idx" ON "work_experiences" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "work_exp_user_visible_idx" ON "work_experiences" USING btree ("user_id","is_visible");--> statement-breakpoint
CREATE INDEX "work_exp_user_sort_idx" ON "work_experiences" USING btree ("user_id","sort_order");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doc_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "doc_type_idx" ON "documents" USING btree ("type");--> statement-breakpoint
ALTER TABLE "job_applications" DROP COLUMN "stages";--> statement-breakpoint
ALTER TABLE "companies" DROP COLUMN "version";