ALTER TABLE "events" ADD COLUMN "activity_type" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "calories_burned" integer;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "status" text;--> statement-breakpoint
CREATE INDEX "events_activity_type_idx" ON "events" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");