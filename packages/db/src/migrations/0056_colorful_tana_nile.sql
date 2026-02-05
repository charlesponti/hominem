DROP INDEX IF EXISTS "transactions_search_idx";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "search_vector" "tsvector";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transactions_search_vector" ON "transactions" USING gin ("search_vector");