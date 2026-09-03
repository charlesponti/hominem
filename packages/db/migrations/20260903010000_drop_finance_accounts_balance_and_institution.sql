-- +goose Up
-- +goose StatementBegin

-- current_balance: not maintained by any real write path (CSV import always
-- inserted it as 0 and nothing updated it afterward) and is redundant with
-- summing app.finance_transactions, which is now how getFinanceNetWorth
-- computes balances. institution: a denormalized copy of the name already
-- available via institution_id -> app.finance_institutions, and it was
-- never actually written by createAccount/updateAccount or the import path.
ALTER TABLE app.finance_accounts
  DROP COLUMN IF EXISTS current_balance,
  DROP COLUMN IF EXISTS institution;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE app.finance_accounts
  ADD COLUMN IF NOT EXISTS current_balance numeric(14,2),
  ADD COLUMN IF NOT EXISTS institution text;

-- +goose StatementEnd
