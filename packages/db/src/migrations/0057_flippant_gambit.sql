DROP INDEX "transactions_search_idx";--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
CREATE INDEX "idx_transactions_search_vector" ON "transactions" USING gin ("search_vector");