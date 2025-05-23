ALTER TABLE "notes" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
CREATE INDEX "notes_search_idx" ON "notes" USING gin ("search_vector");