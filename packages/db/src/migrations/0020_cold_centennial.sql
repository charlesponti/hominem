ALTER TABLE "notes" ADD COLUMN "mentions" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "notes" DROP COLUMN "time_tracking";