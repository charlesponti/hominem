-- This migration was generated from stale schema state and duplicated
-- task list sharing tables that were already introduced in 0004.
-- Keep 0070 as an idempotent cleanup step so fresh databases can
-- migrate successfully while preserving migration history.
DROP POLICY IF EXISTS "finance_categories_tenant_policy" ON "finance_categories";
--> statement-breakpoint
DROP TABLE IF EXISTS "finance_categories" CASCADE;
