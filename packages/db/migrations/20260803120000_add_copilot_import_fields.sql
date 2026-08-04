-- +goose Up

ALTER TABLE app.finance_accounts
  ADD COLUMN IF NOT EXISTS csv_import_key text;

ALTER TABLE app.finance_transactions
  ADD COLUMN IF NOT EXISTS excluded boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS app_finance_accounts_owner_csv_import_key
  ON app.finance_accounts (user_id, csv_import_key)
  WHERE csv_import_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS app_finance_transactions_owner_excluded_idx
  ON app.finance_transactions (user_id, posted_on DESC)
  WHERE excluded = true;

-- +goose Down

DROP INDEX IF EXISTS app.app_finance_transactions_owner_excluded_idx;
DROP INDEX IF EXISTS app.app_finance_accounts_owner_csv_import_key;

ALTER TABLE app.finance_transactions
  DROP COLUMN IF EXISTS excluded;

ALTER TABLE app.finance_accounts
  DROP COLUMN IF EXISTS csv_import_key;
