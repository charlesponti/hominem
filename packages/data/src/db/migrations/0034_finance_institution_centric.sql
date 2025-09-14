-- Migration: Finance Institution-Centric Approach
-- This migration implements the institution-centric approach where plaidItems
-- are used only for internal syncing, not exposed to users

-- Add index to improve performance for institution-based queries
CREATE INDEX IF NOT EXISTS "finance_accounts_institution_id_idx" ON "finance_accounts" ("institution_id");

-- Add index to improve performance for plaid-based queries
CREATE INDEX IF NOT EXISTS "finance_accounts_plaid_item_id_idx" ON "finance_accounts" ("plaid_item_id");

-- Add composite index for user + institution queries
CREATE INDEX IF NOT EXISTS "finance_accounts_user_institution_idx" ON "finance_accounts" ("user_id", "institution_id");

-- Add index for plaid account lookups
CREATE INDEX IF NOT EXISTS "finance_accounts_plaid_account_id_idx" ON "finance_accounts" ("plaid_account_id");

-- Add index for institution status queries
CREATE INDEX IF NOT EXISTS "plaid_items_status_idx" ON "plaid_items" ("status");

-- Add composite index for user + status queries on plaid items
CREATE INDEX IF NOT EXISTS "plaid_items_user_status_idx" ON "plaid_items" ("user_id", "status");

-- Add index for institution name searches
CREATE INDEX IF NOT EXISTS "financial_institutions_name_idx" ON "financial_institutions" ("name");

-- Add comment to document the institution-centric approach
COMMENT ON TABLE "plaid_items" IS 'Internal table for Plaid API integration. Not exposed to users.';
COMMENT ON COLUMN "finance_accounts"."plaid_item_id" IS 'Internal reference for Plaid integration. Use institution_id for user-facing data.'; 
