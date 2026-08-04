-- +goose Up

-- M3: Warehouse 1:1 — re-create finance_statement_periods (dropped by
-- cleanup migration 20260728200105). Anchors balance computation: each
-- period stores a certified opening/closing balance, and transaction
-- deltas since the most recent period end are summed on read.
--
-- Type note: warehouse stores balances as INTEGER cents; hominem uses
-- numeric(14,2). The sync layer converts.

CREATE TABLE app.finance_statement_periods (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id text NOT NULL,
  account_id uuid NOT NULL REFERENCES app.finance_accounts(id),
  period_start_on date NOT NULL,
  period_end_on date NOT NULL,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  closing_balance numeric(14,2) NOT NULL DEFAULT 0,
  currency_code text NOT NULL DEFAULT 'USD'
    CHECK (length(currency_code) = 3 AND currency_code = upper(currency_code)),
  evidence_path text,
  source text NOT NULL DEFAULT 'manual',
  note text,
  certification_status text NOT NULL DEFAULT 'uncertified'
    CHECK (certification_status IN ('uncertified', 'certified', 'variance')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_start_on <= period_end_on),
  UNIQUE (account_id, period_start_on, period_end_on)
);

CREATE INDEX idx_finance_statement_periods_account_end
  ON app.finance_statement_periods(account_id, period_end_on);

CREATE TRIGGER app_finance_statement_periods_set_updated_at
  BEFORE UPDATE ON app.finance_statement_periods
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_snake();

ALTER TABLE app.finance_statement_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_statement_periods FORCE ROW LEVEL SECURITY;

CREATE POLICY app_finance_statement_periods_owner_policy ON app.finance_statement_periods
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

DROP POLICY IF EXISTS app_finance_statement_periods_owner_policy ON app.finance_statement_periods;
ALTER TABLE app.finance_statement_periods DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS app_finance_statement_periods_set_updated_at ON app.finance_statement_periods;
DROP TABLE IF EXISTS app.finance_statement_periods;