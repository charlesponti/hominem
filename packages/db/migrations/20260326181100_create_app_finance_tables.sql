-- +goose Up
CREATE TABLE app.finance_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text,
  provider_institution_id text,
  name text NOT NULL,
  website_url text,
  logo_url text,
  country_code text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.plaid_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES app.finance_institutions(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'plaid',
  provider_item_id text NOT NULL,
  cursor text,
  accessToken text,
  status text NOT NULL DEFAULT 'healthy',
  error_code text,
  error_message text,
  last_synced_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.finance_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  institution_id uuid REFERENCES app.finance_institutions(id) ON DELETE SET NULL,
  plaid_item_id uuid REFERENCES app.plaid_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  account_type text NOT NULL,
  account_subtype text,
  currency_code text NOT NULL DEFAULT 'USD',
  current_balance numeric(14,2),
  available_balance numeric(14,2),
  provider text,
  accountId text,
  mask text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES app.finance_accounts(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  transaction_type text NOT NULL,
  description text,
  merchant_name text,
  posted_on date NOT NULL,
  occurred_at timestamptz,
  pending boolean NOT NULL DEFAULT false,
  source text,
  external_id text,
  notes text,
  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS app.finance_transactions;
DROP TABLE IF EXISTS app.finance_accounts;
DROP TABLE IF EXISTS app.plaid_items;
DROP TABLE IF EXISTS app.finance_institutions;
