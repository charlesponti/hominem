CREATE TABLE IF NOT EXISTS "financial_institutions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "financial_institutions_name_idx"
  ON "financial_institutions" USING btree ("name" text_ops);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "plaid_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "item_id" text NOT NULL,
  "institution_id" uuid REFERENCES "financial_institutions"("id") ON DELETE SET NULL,
  "cursor" text,
  "access_token" text,
  "status" text DEFAULT 'healthy',
  "error" text,
  "last_synced_at" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  UNIQUE ("user_id", "item_id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaid_items_user_id_idx"
  ON "plaid_items" USING btree ("user_id" uuid_ops, "created_at" timestamptz_ops DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaid_items_item_id_idx"
  ON "plaid_items" USING btree ("item_id" text_ops, "created_at" timestamptz_ops DESC);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "budget_goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "category_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "target_amount" numeric(12, 2) NOT NULL CHECK ("target_amount" >= 0),
  "target_period" text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  UNIQUE ("user_id", "category_id", "target_period")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budget_goals_user_id_idx"
  ON "budget_goals" USING btree ("user_id" uuid_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "budget_goals_category_id_idx"
  ON "budget_goals" USING btree ("category_id" uuid_ops);
--> statement-breakpoint

ALTER TABLE "financial_institutions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "financial_institutions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "financial_institutions_tenant_policy" ON "financial_institutions";
--> statement-breakpoint
CREATE POLICY "financial_institutions_tenant_policy" ON "financial_institutions"
  FOR ALL TO public
  USING (app_is_service_role() OR true)
  WITH CHECK (app_is_service_role() OR true);
--> statement-breakpoint

ALTER TABLE "plaid_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "plaid_items" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "plaid_items_tenant_policy" ON "plaid_items";
--> statement-breakpoint
CREATE POLICY "plaid_items_tenant_policy" ON "plaid_items"
  FOR ALL TO public
  USING (app_is_service_role() OR ("user_id" = app_current_user_id()))
  WITH CHECK (app_is_service_role() OR ("user_id" = app_current_user_id()));
--> statement-breakpoint

ALTER TABLE "budget_goals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "budget_goals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "budget_goals_tenant_policy" ON "budget_goals";
--> statement-breakpoint
CREATE POLICY "budget_goals_tenant_policy" ON "budget_goals"
  FOR ALL TO public
  USING (app_is_service_role() OR ("user_id" = app_current_user_id()))
  WITH CHECK (app_is_service_role() OR ("user_id" = app_current_user_id()));
