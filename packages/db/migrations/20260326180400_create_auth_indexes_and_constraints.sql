-- +goose Up
ALTER TABLE auth.users
  ADD CONSTRAINT auth_users_email_not_blank CHECK (length(btrim(email)) > 0);

ALTER TABLE auth.identities
  ADD CONSTRAINT auth_identities_provider_not_blank CHECK (length(btrim(provider)) > 0),
  ADD CONSTRAINT auth_identities_provider_subject_not_blank CHECK (length(btrim(provider_subject)) > 0);

ALTER TABLE auth.sessions
  ADD CONSTRAINT auth_sessions_token_hash_not_blank CHECK (length(btrim(token_hash)) > 0),
  ADD CONSTRAINT auth_sessions_state_not_blank CHECK (length(btrim(state)) > 0),
  ADD CONSTRAINT auth_sessions_auth_level_not_blank CHECK (length(btrim(auth_level)) > 0);

ALTER TABLE auth.refresh_tokens
  ADD CONSTRAINT auth_refresh_tokens_token_hash_not_blank CHECK (length(btrim(token_hash)) > 0);

ALTER TABLE auth.passkeys
  ADD CONSTRAINT auth_passkeys_credential_id_not_blank CHECK (length(btrim(credential_id)) > 0);

ALTER TABLE auth.verification_tokens
  ADD CONSTRAINT auth_verification_tokens_channel_not_blank CHECK (length(btrim(channel)) > 0),
  ADD CONSTRAINT auth_verification_tokens_identifier_not_blank CHECK (length(btrim(identifier)) > 0),
  ADD CONSTRAINT auth_verification_tokens_token_hash_not_blank CHECK (length(btrim(token_hash)) > 0),
  ADD CONSTRAINT auth_verification_tokens_purpose_not_blank CHECK (length(btrim(purpose)) > 0);

ALTER TABLE auth.device_codes
  ADD CONSTRAINT auth_device_codes_device_code_not_blank CHECK (length(btrim(device_code)) > 0),
  ADD CONSTRAINT auth_device_codes_user_code_not_blank CHECK (length(btrim(user_code)) > 0),
  ADD CONSTRAINT auth_device_codes_status_check CHECK (
    status IN ('pending', 'approved', 'denied', 'used', 'expired')
  ),
  ADD CONSTRAINT auth_device_codes_polling_interval_positive CHECK (polling_interval_seconds > 0);

ALTER TABLE auth.api_keys
  ADD CONSTRAINT auth_api_keys_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT auth_api_keys_key_hash_not_blank CHECK (length(btrim(key_hash)) > 0),
  ADD CONSTRAINT auth_api_keys_prefix_not_blank CHECK (length(btrim(prefix)) > 0);

CREATE UNIQUE INDEX auth_users_email_lower_key
  ON auth.users (lower(email));

CREATE UNIQUE INDEX auth_identities_provider_subject_key
  ON auth.identities (provider, provider_subject);

CREATE UNIQUE INDEX auth_identities_user_provider_account_key
  ON auth.identities (user_id, provider, provider_account_id)
  WHERE provider_account_id IS NOT NULL;

CREATE INDEX auth_identities_user_id_idx
  ON auth.identities (user_id);

CREATE UNIQUE INDEX auth_sessions_token_hash_key
  ON auth.sessions (token_hash);

CREATE INDEX auth_sessions_user_id_idx
  ON auth.sessions (user_id, expires_at DESC);

CREATE UNIQUE INDEX auth_refresh_tokens_token_hash_key
  ON auth.refresh_tokens (token_hash);

CREATE INDEX auth_refresh_tokens_session_id_idx
  ON auth.refresh_tokens (session_id);

CREATE INDEX auth_refresh_tokens_family_id_idx
  ON auth.refresh_tokens (family_id);

CREATE UNIQUE INDEX auth_passkeys_credential_id_key
  ON auth.passkeys (credential_id);

CREATE INDEX auth_passkeys_user_id_idx
  ON auth.passkeys (user_id);

CREATE UNIQUE INDEX auth_verification_tokens_identifier_purpose_hash_key
  ON auth.verification_tokens (identifier, purpose, token_hash);

CREATE INDEX auth_verification_tokens_user_id_idx
  ON auth.verification_tokens (user_id, expires_at DESC);

CREATE UNIQUE INDEX auth_device_codes_device_code_key
  ON auth.device_codes (device_code);

CREATE UNIQUE INDEX auth_device_codes_user_code_key
  ON auth.device_codes (user_code);

CREATE INDEX auth_device_codes_user_id_idx
  ON auth.device_codes (user_id);

CREATE UNIQUE INDEX auth_api_keys_key_hash_key
  ON auth.api_keys (key_hash);

CREATE INDEX auth_api_keys_user_id_idx
  ON auth.api_keys (user_id);

CREATE TRIGGER auth_users_set_updated_at
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER auth_identities_set_updated_at
  BEFORE UPDATE ON auth.identities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER auth_device_codes_set_updated_at
  BEFORE UPDATE ON auth.device_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER auth_api_keys_set_updated_at
  BEFORE UPDATE ON auth.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- +goose Down
DROP TRIGGER IF EXISTS auth_api_keys_set_updated_at ON auth.api_keys;
DROP TRIGGER IF EXISTS auth_device_codes_set_updated_at ON auth.device_codes;
DROP TRIGGER IF EXISTS auth_identities_set_updated_at ON auth.identities;
DROP TRIGGER IF EXISTS auth_users_set_updated_at ON auth.users;

DROP INDEX IF EXISTS auth_api_keys_user_id_idx;
DROP INDEX IF EXISTS auth_api_keys_key_hash_key;
DROP INDEX IF EXISTS auth_device_codes_user_id_idx;
DROP INDEX IF EXISTS auth_device_codes_user_code_key;
DROP INDEX IF EXISTS auth_device_codes_device_code_key;
DROP INDEX IF EXISTS auth_verification_tokens_user_id_idx;
DROP INDEX IF EXISTS auth_verification_tokens_identifier_purpose_hash_key;
DROP INDEX IF EXISTS auth_passkeys_user_id_idx;
DROP INDEX IF EXISTS auth_passkeys_credential_id_key;
DROP INDEX IF EXISTS auth_refresh_tokens_family_id_idx;
DROP INDEX IF EXISTS auth_refresh_tokens_session_id_idx;
DROP INDEX IF EXISTS auth_refresh_tokens_token_hash_key;
DROP INDEX IF EXISTS auth_sessions_user_id_idx;
DROP INDEX IF EXISTS auth_sessions_token_hash_key;
DROP INDEX IF EXISTS auth_identities_user_id_idx;
DROP INDEX IF EXISTS auth_identities_user_provider_account_key;
DROP INDEX IF EXISTS auth_identities_provider_subject_key;
DROP INDEX IF EXISTS auth_users_email_lower_key;

ALTER TABLE auth.api_keys
  DROP CONSTRAINT IF EXISTS auth_api_keys_prefix_not_blank,
  DROP CONSTRAINT IF EXISTS auth_api_keys_key_hash_not_blank,
  DROP CONSTRAINT IF EXISTS auth_api_keys_name_not_blank;

ALTER TABLE auth.device_codes
  DROP CONSTRAINT IF EXISTS auth_device_codes_polling_interval_positive,
  DROP CONSTRAINT IF EXISTS auth_device_codes_status_check,
  DROP CONSTRAINT IF EXISTS auth_device_codes_user_code_not_blank,
  DROP CONSTRAINT IF EXISTS auth_device_codes_device_code_not_blank;

ALTER TABLE auth.verification_tokens
  DROP CONSTRAINT IF EXISTS auth_verification_tokens_purpose_not_blank,
  DROP CONSTRAINT IF EXISTS auth_verification_tokens_token_hash_not_blank,
  DROP CONSTRAINT IF EXISTS auth_verification_tokens_identifier_not_blank,
  DROP CONSTRAINT IF EXISTS auth_verification_tokens_channel_not_blank;

ALTER TABLE auth.passkeys
  DROP CONSTRAINT IF EXISTS auth_passkeys_credential_id_not_blank;

ALTER TABLE auth.refresh_tokens
  DROP CONSTRAINT IF EXISTS auth_refresh_tokens_token_hash_not_blank;

ALTER TABLE auth.sessions
  DROP CONSTRAINT IF EXISTS auth_sessions_auth_level_not_blank,
  DROP CONSTRAINT IF EXISTS auth_sessions_state_not_blank,
  DROP CONSTRAINT IF EXISTS auth_sessions_token_hash_not_blank;

ALTER TABLE auth.identities
  DROP CONSTRAINT IF EXISTS auth_identities_provider_subject_not_blank,
  DROP CONSTRAINT IF EXISTS auth_identities_provider_not_blank;

ALTER TABLE auth.users
  DROP CONSTRAINT IF EXISTS auth_users_email_not_blank;
