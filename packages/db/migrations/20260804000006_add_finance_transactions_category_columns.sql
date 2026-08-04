-- +goose Up

-- M7: Warehouse 1:1 — add categorization, mask, and currency columns to
-- app.finance_transactions. `excluded` is already added by the pending
-- migration 20260803120000. `category_id` is an FK into the new
-- finance_categories table (M1).

ALTER TABLE app.finance_transactions
  ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS account_mask text,
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES app.finance_categories(id),
  ADD COLUMN IF NOT EXISTS category_assignment_source text NOT NULL DEFAULT 'source',
  ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false;

ALTER TABLE app.finance_transactions
  ADD CONSTRAINT app_finance_transactions_currency_code_check
    CHECK (length(currency_code) = 3 AND currency_code = upper(currency_code)),
  ADD CONSTRAINT app_finance_transactions_category_source_check
    CHECK (category_assignment_source IN ('source', 'unmapped', 'manual', 'rule'));

CREATE INDEX IF NOT EXISTS idx_finance_transactions_category
  ON app.finance_transactions(category_id);

-- +goose Down

DROP INDEX IF EXISTS app.idx_finance_transactions_category;

ALTER TABLE app.finance_transactions
  DROP CONSTRAINT IF EXISTS app_finance_transactions_category_source_check,
  DROP CONSTRAINT IF EXISTS app_finance_transactions_currency_code_check;

ALTER TABLE app.finance_transactions
  DROP COLUMN IF EXISTS recurring,
  DROP COLUMN IF EXISTS category_assignment_source,
  DROP COLUMN IF EXISTS category_id,
  DROP COLUMN IF EXISTS account_mask,
  DROP COLUMN IF EXISTS currency_code;