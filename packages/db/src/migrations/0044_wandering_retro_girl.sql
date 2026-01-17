CREATE TYPE "public"."event_source" AS ENUM('manual', 'google_calendar');--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "source" "event_source" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "calendar_id" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "last_synced_at" timestamp;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "sync_error" text;--> statement-breakpoint
CREATE INDEX "events_external_id_idx" ON "events" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "events_calendar_id_idx" ON "events" USING btree ("calendar_id");--> statement-breakpoint
CREATE INDEX "events_source_idx" ON "events" USING btree ("source");--> statement-breakpoint
CREATE UNIQUE INDEX "events_external_calendar_unique" ON "events" USING btree ("external_id","calendar_id");