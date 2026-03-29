-- +goose Up
ALTER TABLE app.finance_institutions
  ADD CONSTRAINT app_finance_institutions_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_finance_institutions_provider_not_blank CHECK (
    provider IS NULL OR length(btrim(provider)) > 0
  ),
  ADD CONSTRAINT app_finance_institutions_provider_institution_id_not_blank CHECK (
    provider_institution_id IS NULL OR length(btrim(provider_institution_id)) > 0
  ),
  ADD CONSTRAINT app_finance_institutions_country_code_check CHECK (
    country_code IS NULL OR country_code ~ '^[A-Z]{2}$'
  );

ALTER TABLE app.plaid_items
  ADD CONSTRAINT app_plaid_items_provider_not_blank CHECK (length(btrim(provider)) > 0),
  ADD CONSTRAINT app_plaid_items_provider_item_id_not_blank CHECK (length(btrim(provider_item_id)) > 0),
  ADD CONSTRAINT app_plaid_items_status_check CHECK (
    status IN ('healthy', 'needs_attention', 'error', 'revoked')
  ),
  ADD CONSTRAINT app_plaid_items_access_token_not_blank CHECK (
    accessToken IS NULL OR length(btrim(accessToken)) > 0
  ),
  ADD CONSTRAINT app_plaid_items_error_code_not_blank CHECK (
    error_code IS NULL OR length(btrim(error_code)) > 0
  ),
  ADD CONSTRAINT app_plaid_items_error_message_not_blank CHECK (
    error_message IS NULL OR length(btrim(error_message)) > 0
  );

ALTER TABLE app.finance_accounts
  ADD CONSTRAINT app_finance_accounts_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_finance_accounts_account_type_not_blank CHECK (length(btrim(account_type)) > 0),
  ADD CONSTRAINT app_finance_accounts_account_subtype_not_blank CHECK (
    account_subtype IS NULL OR length(btrim(account_subtype)) > 0
  ),
  ADD CONSTRAINT app_finance_accounts_currency_code_check CHECK (currency_code ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT app_finance_accounts_provider_not_blank CHECK (
    provider IS NULL OR length(btrim(provider)) > 0
  ),
  ADD CONSTRAINT app_finance_accounts_provider_account_id_not_blank CHECK (
    accountId IS NULL OR length(btrim(accountId)) > 0
  ),
  ADD CONSTRAINT app_finance_accounts_balance_order_check CHECK (
    current_balance IS NULL OR available_balance IS NULL OR available_balance <= current_balance
  );

ALTER TABLE app.finance_transactions
  ADD CONSTRAINT app_finance_transactions_transaction_type_check CHECK (
    transaction_type IN ('debit', 'credit', 'transfer', 'adjustment')
  ),
  ADD CONSTRAINT app_finance_transactions_source_not_blank CHECK (
    source IS NULL OR length(btrim(source)) > 0
  ),
  ADD CONSTRAINT app_finance_transactions_external_id_not_blank CHECK (
    external_id IS NULL OR length(btrim(external_id)) > 0
  ),
  ADD CONSTRAINT app_finance_transactions_description_not_blank CHECK (
    description IS NULL OR length(btrim(description)) > 0
  ),
  ADD CONSTRAINT app_finance_transactions_merchant_name_not_blank CHECK (
    merchant_name IS NULL OR length(btrim(merchant_name)) > 0
  ),
  ADD CONSTRAINT app_finance_transactions_occurred_at_check CHECK (
    occurred_at IS NULL OR occurred_at::date >= posted_on - 30
  );

CREATE UNIQUE INDEX app_finance_institutions_provider_key
  ON app.finance_institutions (provider, provider_institution_id)
  WHERE provider IS NOT NULL AND provider_institution_id IS NOT NULL;

CREATE INDEX app_finance_institutions_name_idx
  ON app.finance_institutions (lower(name));

CREATE UNIQUE INDEX app_plaid_items_owner_provider_item_key
  ON app.plaid_items (owner_userId, provider, provider_item_id);

CREATE INDEX app_plaid_items_institution_id_idx
  ON app.plaid_items (institution_id);

CREATE INDEX app_plaid_items_owner_status_idx
  ON app.plaid_items (owner_userId, status);

CREATE UNIQUE INDEX app_finance_accounts_owner_provider_account_key
  ON app.finance_accounts (owner_userId, provider, accountId)
  WHERE provider IS NOT NULL AND accountId IS NOT NULL;

CREATE INDEX app_finance_accounts_owner_active_idx
  ON app.finance_accounts (owner_userId, is_active);

CREATE INDEX app_finance_accounts_plaid_item_id_idx
  ON app.finance_accounts (plaid_item_id);

CREATE INDEX app_finance_accounts_institution_id_idx
  ON app.finance_accounts (institution_id);

CREATE UNIQUE INDEX app_finance_transactions_owner_source_external_key
  ON app.finance_transactions (owner_userId, source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX app_finance_transactions_account_posted_on_idx
  ON app.finance_transactions (account_id, posted_on DESC);

CREATE INDEX app_finance_transactions_owner_posted_on_idx
  ON app.finance_transactions (owner_userId, posted_on DESC);

CREATE INDEX app_finance_transactions_owner_pending_idx
  ON app.finance_transactions (owner_userId, posted_on DESC)
  WHERE pending = true;

CREATE TRIGGER app_finance_institutions_set_updated_at
  BEFORE UPDATE ON app.finance_institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_plaid_items_set_updated_at
  BEFORE UPDATE ON app.plaid_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_finance_accounts_set_updated_at
  BEFORE UPDATE ON app.finance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_finance_transactions_set_updated_at
  BEFORE UPDATE ON app.finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- +goose Down
DROP TRIGGER IF EXISTS app_finance_transactions_set_updated_at ON app.finance_transactions;
DROP TRIGGER IF EXISTS app_finance_accounts_set_updated_at ON app.finance_accounts;
DROP TRIGGER IF EXISTS app_plaid_items_set_updated_at ON app.plaid_items;
DROP TRIGGER IF EXISTS app_finance_institutions_set_updated_at ON app.finance_institutions;

DROP INDEX IF EXISTS app_finance_transactions_owner_pending_idx;
DROP INDEX IF EXISTS app_finance_transactions_owner_posted_on_idx;
DROP INDEX IF EXISTS app_finance_transactions_account_posted_on_idx;
DROP INDEX IF EXISTS app_finance_transactions_owner_source_external_key;
DROP INDEX IF EXISTS app_finance_accounts_institution_id_idx;
DROP INDEX IF EXISTS app_finance_accounts_plaid_item_id_idx;
DROP INDEX IF EXISTS app_finance_accounts_owner_active_idx;
DROP INDEX IF EXISTS app_finance_accounts_owner_provider_account_key;
DROP INDEX IF EXISTS app_plaid_items_owner_status_idx;
DROP INDEX IF EXISTS app_plaid_items_institution_id_idx;
DROP INDEX IF EXISTS app_plaid_items_owner_provider_item_key;
DROP INDEX IF EXISTS app_finance_institutions_name_idx;
DROP INDEX IF EXISTS app_finance_institutions_provider_key;

ALTER TABLE app.finance_transactions
  DROP CONSTRAINT IF EXISTS app_finance_transactions_occurred_at_check,
  DROP CONSTRAINT IF EXISTS app_finance_transactions_merchant_name_not_blank,
  DROP CONSTRAINT IF EXISTS app_finance_transactions_description_not_blank,
  DROP CONSTRAINT IF EXISTS app_finance_transactions_external_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_finance_transactions_source_not_blank,
  DROP CONSTRAINT IF EXISTS app_finance_transactions_transaction_type_check;

ALTER TABLE app.finance_accounts
  DROP CONSTRAINT IF EXISTS app_finance_accounts_balance_order_check,
  DROP CONSTRAINT IF EXISTS app_finance_accounts_provider_account_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_finance_accounts_provider_not_blank,
  DROP CONSTRAINT IF EXISTS app_finance_accounts_currency_code_check,
  DROP CONSTRAINT IF EXISTS app_finance_accounts_account_subtype_not_blank,
  DROP CONSTRAINT IF EXISTS app_finance_accounts_account_type_not_blank,
  DROP CONSTRAINT IF EXISTS app_finance_accounts_name_not_blank;

ALTER TABLE app.plaid_items
  DROP CONSTRAINT IF EXISTS app_plaid_items_error_message_not_blank,
  DROP CONSTRAINT IF EXISTS app_plaid_items_error_code_not_blank,
  DROP CONSTRAINT IF EXISTS app_plaid_items_access_token_not_blank,
  DROP CONSTRAINT IF EXISTS app_plaid_items_status_check,
  DROP CONSTRAINT IF EXISTS app_plaid_items_provider_item_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_plaid_items_provider_not_blank;

ALTER TABLE app.finance_institutions
  DROP CONSTRAINT IF EXISTS app_finance_institutions_country_code_check,
  DROP CONSTRAINT IF EXISTS app_finance_institutions_provider_institution_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_finance_institutions_provider_not_blank,
  DROP CONSTRAINT IF EXISTS app_finance_institutions_name_not_blank;
