-- +goose Up

-- M5: Warehouse 1:1 — create finance_tax_filing_status_events, an
-- append-only status-transition log for tax filings. Each event records
-- a status_code and human-readable message from the import source.
-- No updated_at column (warehouse convention for immutable log tables;
-- rows are inserted once and never updated).

CREATE TABLE app.finance_tax_filing_status_events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id text NOT NULL,
  filing_id uuid NOT NULL REFERENCES app.finance_tax_filings(id) ON DELETE CASCADE,
  filing_type_raw text,
  status_code integer NOT NULL,
  message text,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_finance_tax_filing_status_events_filing
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

-- +goose Down

DROP POLICY IF EXISTS app_finance_tax_filing_status_events_owner_policy
  ON app.finance_tax_filing_status_events;
ALTER TABLE app.finance_tax_filing_status_events DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS app.finance_tax_filing_status_events;