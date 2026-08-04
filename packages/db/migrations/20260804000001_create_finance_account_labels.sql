-- +goose Up

-- M2: Warehouse 1:1 — create finance_account_labels for account
-- alias/renaming history. Used during import to fuzzy-match raw
-- institution+account name strings to the correct finance_accounts row.
-- At most one active resolution per lowercased label (partial unique index
-- WHERE resolves_to_account = true AND effective_to IS NULL).

CREATE TABLE app.finance_account_labels (
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

CREATE INDEX idx_finance_account_labels_account
  ON app.finance_account_labels(account_id, label_kind);
CREATE INDEX idx_finance_account_labels_kind
  ON app.finance_account_labels(label_kind);
CREATE UNIQUE INDEX idx_finance_account_labels_active_resolution
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

-- +goose Down

DROP POLICY IF EXISTS app_finance_account_labels_owner_policy ON app.finance_account_labels;
ALTER TABLE app.finance_account_labels DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS app_finance_account_labels_set_updated_at ON app.finance_account_labels;
DROP TABLE IF EXISTS app.finance_account_labels;