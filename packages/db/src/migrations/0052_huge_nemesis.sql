CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"due_date" timestamp(3),
	"user_id" uuid NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "content_strategies" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "content" CASCADE;--> statement-breakpoint
DROP TABLE "content_strategies" CASCADE;--> statement-breakpoint
DROP INDEX "notes_search_idx";--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "excerpt" text;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "publishing_metadata" json;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "parent_note_id" uuid;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "version_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "is_latest_version" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "publishedAt" timestamp(3);--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "scheduledFor" timestamp(3);--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_user_idx" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_due_date_idx" ON "tasks" USING btree ("due_date");--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_parent_fk" FOREIGN KEY ("parent_note_id") REFERENCES "public"."notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notes_status_idx" ON "notes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notes_type_idx" ON "notes" USING btree ("type");--> statement-breakpoint
CREATE INDEX "notes_user_idx" ON "notes" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "notes_published_at_idx" ON "notes" USING btree ("publishedAt");--> statement-breakpoint
CREATE INDEX "notes_parent_idx" ON "notes" USING btree ("parent_note_id");--> statement-breakpoint
CREATE INDEX "notes_latest_idx" ON "notes" USING btree ("is_latest_version");--> statement-breakpoint
CREATE INDEX "notes_version_idx" ON "notes" USING btree ("parent_note_id","version_number");--> statement-breakpoint
CREATE INDEX "notes_search_idx" ON "notes" USING gin ((
        setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('english', "content"), 'B') ||
        setweight(to_tsvector('english', coalesce("tags"::text, '')), 'C') ||
        setweight(to_tsvector('english', coalesce("excerpt", '')), 'D')
      ));--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "task_metadata";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "tweet_metadata";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "synced";