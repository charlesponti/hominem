-- +goose Up
-- +goose StatementBegin
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  email text NOT NULL,
  name text,
  avatar_url text,
  email_verified_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.sessions (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  userId uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  state text NOT NULL DEFAULT 'active',
  amr jsonb NOT NULL DEFAULT '[]'::jsonb,
  auth_level text NOT NULL DEFAULT 'neutral',
  ip_hash text,
  user_agent_hash text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.refresh_tokens (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
  family_id uuid NOT NULL,
  parent_id uuid,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  revoked_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.identities (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  userId uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_account_id text,
  provider_subject text NOT NULL,
  access_token_encrypted text,
  refresh_token_encrypted text,
  id_token_encrypted text,
  scope text,
  last_used_at timestamptz,
  revoked_at timestamptz,
  linked_at timestamptz NOT NULL DEFAULT now(),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.verification_tokens (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  identifier text NOT NULL,
  token_hash text NOT NULL,
  channel text NOT NULL,
  purpose text NOT NULL,
  userId uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.passkeys (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  userId uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL,
  public_key bytea NOT NULL,
  device_type text,
  backed_up boolean NOT NULL DEFAULT false,
  sign_count bigint NOT NULL DEFAULT 0,
  transports text[],
  friendly_name text,
  aaguid text,
  last_used_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.device_codes (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  device_code text NOT NULL,
  user_code text NOT NULL,
  userId uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL,
  last_polled_at timestamptz,
  polling_interval_seconds integer NOT NULL DEFAULT 5,
  client_id text,
  scope text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth.api_keys (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  userId uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  prefix text NOT NULL,
  key_hash text NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_users_email_idx ON auth.users (email);
CREATE INDEX auth_sessions_userId_idx ON auth.sessions (userId);
CREATE INDEX auth_refresh_tokens_session_id_idx ON auth.refresh_tokens (session_id);
CREATE INDEX auth_identities_userId_idx ON auth.identities (userId);
CREATE INDEX auth_passkeys_userId_idx ON auth.passkeys (userId);
CREATE INDEX auth_device_codes_userId_idx ON auth.device_codes (userId);
CREATE INDEX auth_api_keys_userId_idx ON auth.api_keys (userId);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS auth.api_keys;
DROP TABLE IF EXISTS auth.device_codes;
DROP TABLE IF EXISTS auth.passkeys;
DROP TABLE IF EXISTS auth.verification_tokens;
DROP TABLE IF EXISTS auth.identities;
DROP TABLE IF EXISTS auth.refresh_tokens;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.users;
DROP INDEX IF EXISTS auth_api_keys_userId_idx;
DROP INDEX IF EXISTS auth_device_codes_userId_idx;
DROP INDEX IF EXISTS auth_passkeys_userId_idx;
DROP INDEX IF EXISTS auth_identities_userId_idx;
DROP INDEX IF EXISTS auth_refresh_tokens_session_id_idx;
DROP INDEX IF EXISTS auth_sessions_userId_idx;
DROP INDEX IF EXISTS auth_users_email_idx;
-- +goose StatementEnd
