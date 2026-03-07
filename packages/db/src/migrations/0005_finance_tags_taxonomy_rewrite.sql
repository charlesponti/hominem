DROP POLICY IF EXISTS "finance_categories_tenant_policy" ON "finance_categories";
--> statement-breakpoint
DROP TABLE IF EXISTS "finance_categories" CASCADE;
--> statement-breakpoint
DROP INDEX IF EXISTS "finance_transactions_category_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "finance_transactions_2022_user_id_category_id_date_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "finance_transactions_2023_user_id_category_id_date_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "finance_transactions_2024_user_id_category_id_date_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "finance_transactions_2025_user_id_category_id_date_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "finance_transactions_2026_user_id_category_id_date_idx";
--> statement-breakpoint
DROP INDEX IF EXISTS "finance_transactions_default_user_id_category_id_date_idx";
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_transactions_user_date_id_idx"
  ON "finance_transactions" USING btree ("user_id" uuid_ops, "date" date_ops DESC, "id" uuid_ops DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "finance_transactions_user_account_date_id_idx"
  ON "finance_transactions" USING btree ("user_id" uuid_ops, "account_id" uuid_ops, "date" date_ops DESC, "id" uuid_ops DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tagged_items_finance_txn_tag_entity_idx"
  ON "tagged_items" USING btree ("tag_id" uuid_ops, "entity_id" uuid_ops)
  WHERE ("entity_type" = 'finance_transaction');
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tagged_items_finance_txn_entity_tag_idx"
  ON "tagged_items" USING btree ("entity_id" uuid_ops, "tag_id" uuid_ops)
  WHERE ("entity_type" = 'finance_transaction');
