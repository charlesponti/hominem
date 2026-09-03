-- +goose Up
-- +goose StatementBegin

-- Whole tables never referenced by any repository, route, or worker code
-- (verified: only the migrations and the generated Kysely types name them).
DROP TABLE IF EXISTS app.finance_tax_filing_status_events;
DROP TABLE IF EXISTS app.finance_tax_filings;
DROP TABLE IF EXISTS app.finance_account_labels;

-- finance_statement_periods: only reader was getFinanceNetWorth's
-- statement-anchored balance calc, which now sums the full ledger instead
-- (see finance-mcp.service.ts). No create/update/list API route ever
-- existed for this table.
DROP POLICY IF EXISTS app_finance_statement_periods_owner_policy ON app.finance_statement_periods;
DROP TRIGGER IF EXISTS app_finance_statement_periods_set_updated_at ON app.finance_statement_periods;
DROP TABLE IF EXISTS app.finance_statement_periods;

-- finance_categories.parent_id: category hierarchy is unused -- the app's
-- actual tagging feature operates on the separate app.tags table.
DROP INDEX IF EXISTS app.idx_finance_categories_parent;
ALTER TABLE app.finance_categories DROP CONSTRAINT IF EXISTS finance_categories_name_parent_id_key;
ALTER TABLE app.finance_categories DROP COLUMN IF EXISTS parent_id;

-- finance_institutions: set at insert time via institutions.ts, but only
-- name/logo_url are ever read or written; these four were dead on arrival.
ALTER TABLE app.finance_institutions
  DROP COLUMN IF EXISTS provider,
  DROP COLUMN IF EXISTS provider_institution_id,
  DROP COLUMN IF EXISTS country_code,
  DROP COLUMN IF EXISTS website_url;

-- plaid_items: provider relies on its DB default and is never read;
-- error_message is never set by any sync path and never displayed
-- (error_code carries the status that IS surfaced).
ALTER TABLE app.plaid_items
  DROP COLUMN IF EXISTS provider,
  DROP COLUMN IF EXISTS error_message;

-- finance_accounts: none of these are set by createAccount/updateAccount
-- or the CSV import path, and none are read by any route or service.
ALTER TABLE app.finance_accounts
  DROP COLUMN IF EXISTS account_subtype,
  DROP COLUMN IF EXISTS available_balance,
  DROP COLUMN IF EXISTS closed_on,
  DROP COLUMN IF EXISTS opened_on,
  DROP COLUMN IF EXISTS is_active;

-- finance_transactions: account_mask/recurring are parsed off the Copilot
-- CSV row but never copied into these columns on insert, and
-- category_assignment_source is never read or written outside test
-- fixtures.
ALTER TABLE app.finance_transactions
  DROP COLUMN IF EXISTS account_mask,
  DROP COLUMN IF EXISTS category_assignment_source,
  DROP COLUMN IF EXISTS recurring;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE app.finance_transactions
  ADD COLUMN IF NOT EXISTS account_mask text,
  ADD COLUMN IF NOT EXISTS category_assignment_source text NOT NULL DEFAULT 'source',
  ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false;

ALTER TABLE app.finance_transactions
  ADD CONSTRAINT app_finance_transactions_category_source_check
    CHECK (category_assignment_source IN ('source', 'unmapped', 'manual', 'rule'));

ALTER TABLE app.finance_accounts
  ADD COLUMN IF NOT EXISTS account_subtype text,
  ADD COLUMN IF NOT EXISTS available_balance numeric(14,2),
  ADD COLUMN IF NOT EXISTS closed_on date,
  ADD COLUMN IF NOT EXISTS opened_on date,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE app.plaid_items
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'plaid',
  ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE app.finance_institutions
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_institution_id text,
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS website_url text;

ALTER TABLE app.finance_categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES app.finance_categories(id);
ALTER TABLE app.finance_categories
  ADD CONSTRAINT finance_categories_name_parent_id_key UNIQUE (name, parent_id);
CREATE INDEX IF NOT EXISTS idx_finance_categories_parent
  ON app.finance_categories(parent_id);

CREATE TABLE IF NOT EXISTS app.finance_statement_periods (
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

CREATE INDEX IF NOT EXISTS idx_finance_statement_periods_account_end
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

CREATE TABLE IF NOT EXISTS app.finance_account_labels (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id text NOT NULL,
  account_id uuid NOT NULL REFERENCES app.finance_accounts(id) ON DELETE CASCADE,
  label text NOT NULL,
  label_kind text NOT NULL CHECK (label_kind IN ('canonical', 'alias', 'historical_name')),
  institution text,
  effective_from date,
  effective_to date,
  source text NOT NULL DEFAULT 'manual',
  confidence real NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  is_generic boolean NOT NULL DEFAULT false,
  resolves_to_account boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (trim(label) <> '')
);

CREATE INDEX IF NOT EXISTS idx_finance_account_labels_account
  ON app.finance_account_labels(account_id, label_kind);
CREATE INDEX IF NOT EXISTS idx_finance_account_labels_kind
  ON app.finance_account_labels(label_kind);
CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_account_labels_active_resolution
  ON app.finance_account_labels(lower(trim(label)))
  WHERE resolves_to_account = true AND effective_to IS NULL;

CREATE TRIGGER app_finance_account_labels_set_updated_at
  BEFORE UPDATE ON app.finance_account_labels
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_snake();

ALTER TABLE app.finance_account_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_account_labels FORCE ROW LEVEL SECURITY;

CREATE POLICY app_finance_account_labels_owner_policy ON app.finance_account_labels
  FOR ALL
  USING (
    auth.is_service_role()
    OR user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR user_id = auth.current_user_id()
  );

CREATE TABLE IF NOT EXISTS app.finance_tax_filings (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id text NOT NULL,
  external_filing_id text NOT NULL,
  filing_type_raw text NOT NULL,
  jurisdiction text NOT NULL,
  return_type text NOT NULL,
  app_name text,
  tax_year integer NOT NULL,
  received_at date,
  postmark_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_tax_filings_external
  ON app.finance_tax_filings(external_filing_id);

CREATE TRIGGER app_finance_tax_filings_set_updated_at
  BEFORE UPDATE ON app.finance_tax_filings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at_snake();

ALTER TABLE app.finance_tax_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_tax_filings FORCE ROW LEVEL SECURITY;

CREATE POLICY app_finance_tax_filings_owner_policy ON app.finance_tax_filings
  FOR ALL
  USING (
    auth.is_service_role()
    OR user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR user_id = auth.current_user_id()
  );

CREATE TABLE IF NOT EXISTS app.finance_tax_filing_status_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id text NOT NULL,
  filing_id uuid NOT NULL REFERENCES app.finance_tax_filings(id) ON DELETE CASCADE,
  filing_type_raw text,
  status_code integer NOT NULL,
  message text,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_tax_filing_status_events_filing
  ON app.finance_tax_filing_status_events(filing_id, occurred_at);

ALTER TABLE app.finance_tax_filing_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_tax_filing_status_events FORCE ROW LEVEL SECURITY;

CREATE POLICY app_finance_tax_filing_status_events_owner_policy
  ON app.finance_tax_filing_status_events
  FOR ALL
  USING (
    auth.is_service_role()
    OR user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR user_id = auth.current_user_id()
  );

-- +goose StatementEnd
