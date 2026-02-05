-- Add generated column for full-text search on transactions
-- This dramatically improves search performance by pre-computing the tsvector

ALTER TABLE "transactions"
ADD COLUMN "search_vector" tsvector
GENERATED ALWAYS AS (
  to_tsvector('english',
    coalesce(description, '') || ' ' ||
    coalesce(merchant_name, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(parent_category, '') || ' ' ||
    coalesce(tags, '') || ' ' ||
    coalesce(note, '') || ' ' ||
    coalesce(payment_channel, '') || ' ' ||
    coalesce(source, '')
  )
) STORED;
--> statement-breakpoint

-- Create GIN index for fast full-text search
CREATE INDEX "idx_transactions_search_vector" ON "transactions" USING GIN("search_vector");
