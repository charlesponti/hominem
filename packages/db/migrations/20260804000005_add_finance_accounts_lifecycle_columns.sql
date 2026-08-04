-- +goose Up

-- M6: Warehouse 1:1 — add lifecycle and denormalized columns to
-- app.finance_accounts. `institution` is a convenience denormalization
-- (the name can be resolved from institution_id, but storing it avoids
-- the join during sync). `lifecycle_status` tracks account open/closed
-- state; `include_in_net_worth` is a manual override for net-worth
-- computation.

ALTER TABLE app.finance_accounts
  ADD COLUMN IF NOT EXISTS institution text,
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS opened_on date,
  ADD COLUMN IF NOT EXISTS closed_on date,
  ADD COLUMN IF NOT EXISTS include_in_net_worth boolean NOT NULL DEFAULT true;

ALTER TABLE app.finance_accounts
  ADD CONSTRAINT app_finance_accounts_lifecycle_status_check
    CHECK (lifecycle_status IN ('open', 'closed', 'historical', 'unknown'));

-- +goose Down

ALTER TABLE app.finance_accounts
  DROP CONSTRAINT IF EXISTS app_finance_accounts_lifecycle_status_check;

ALTER TABLE app.finance_accounts
  DROP COLUMN IF EXISTS include_in_net_worth,
  DROP COLUMN IF EXISTS closed_on,
  DROP COLUMN IF EXISTS opened_on,
  DROP COLUMN IF EXISTS lifecycle_status,
  DROP COLUMN IF EXISTS institution;