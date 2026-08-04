-- +goose Up

-- M4: Warehouse 1:1 — create finance_tax_filings. Each row represents a
-- filed tax return with jurisdiction, return type, and tax year. The
-- `external_filing_id` is the unique key from the import source
-- (TurboTax); `filing_type_raw` preserves the original verbatim label.

CREATE TABLE app.finance_tax_filings (
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

CREATE UNIQUE INDEX idx_finance_tax_filings_external
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

-- +goose Down

DROP POLICY IF EXISTS app_finance_tax_filings_owner_policy ON app.finance_tax_filings;
ALTER TABLE app.finance_tax_filings DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS app_finance_tax_filings_set_updated_at ON app.finance_tax_filings;
DROP TABLE IF EXISTS app.finance_tax_filings;