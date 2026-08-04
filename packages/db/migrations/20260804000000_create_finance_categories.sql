-- +goose Up

-- M1: Warehouse 1:1 — re-create finance_categories (dropped by cleanup
-- migration 20260728200105) with the warehouse-aligned schema. Old hominem
-- cruft had `kind`/`owner_userId`; warehouse has `name`/`parent_id` with
-- UNIQUE(name, parent_id) allowing same leaf name under different parents.

CREATE TABLE app.finance_categories (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id text NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES app.finance_categories(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, parent_id)
);

CREATE INDEX idx_finance_categories_user
  ON app.finance_categories(user_id);
CREATE INDEX idx_finance_categories_parent
  ON app.finance_categories(parent_id);

CREATE TRIGGER app_finance_categories_set_updated_at
  BEFORE UPDATE ON app.finance_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_snake();

ALTER TABLE app.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_categories FORCE ROW LEVEL SECURITY;

CREATE POLICY app_finance_categories_owner_policy ON app.finance_categories
  FOR ALL
  USING (
    auth.is_service_role()
    OR user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR user_id = auth.current_user_id()
  );

-- +goose Down

DROP POLICY IF EXISTS app_finance_categories_owner_policy ON app.finance_categories;
ALTER TABLE app.finance_categories DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS app_finance_categories_set_updated_at ON app.finance_categories;
DROP TABLE IF EXISTS app.finance_categories;