-- +goose Up
-- +goose StatementBegin

-- Restore app.finance_transactions.recurring, dropped by
-- 20260903000000_drop_dead_finance_schema as "never copied on insert".
-- The personal-finance merge needs it: the live runway projection averages
-- trailing recurring-flagged debits, and the Copilot import path now copies
-- the flag on insert (Copilot's `recurring` column carries the series name,
-- e.g. 'Netflix', whenever the row belongs to a series — any non-empty value
-- other than 'false' counts, mirroring the pfin truthiness rule).

ALTER TABLE app.finance_transactions
  ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_finance_transactions_recurring
  ON app.finance_transactions(user_id, posted_on DESC)
  WHERE recurring = true;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS app.idx_finance_transactions_recurring;

ALTER TABLE app.finance_transactions
  DROP COLUMN IF EXISTS recurring;

-- +goose StatementEnd
