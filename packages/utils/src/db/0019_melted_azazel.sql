ALTER TABLE "application_notes" DROP CONSTRAINT "application_notes_note_id_notes_id_fk";
--> statement-breakpoint
ALTER TABLE "notes" DROP CONSTRAINT "idea_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "list_invite" ADD COLUMN "acceptedAt" timestamp(3);--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "type" text DEFAULT 'note' NOT NULL;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "task_metadata" json;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "time_tracking" json;--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "synced" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_notes" DROP COLUMN "note_id";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "is_task";--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "is_complete";