ALTER TABLE users
  ADD COLUMN IF NOT EXISTS image text,
  ADD COLUMN IF NOT EXISTS email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS user_session (
  id text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamp with time zone NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS user_session_user_id_idx ON user_session(user_id);

CREATE TABLE IF NOT EXISTS user_account (
  id text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE cascade,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamp with time zone,
  refresh_token_expires_at timestamp with time zone,
  scope text,
  password text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_account_user_id_idx ON user_account(user_id);

CREATE TABLE IF NOT EXISTS user_verification (
  id text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_verification_identifier_idx ON user_verification(identifier);

CREATE TABLE IF NOT EXISTS user_passkey (
  id text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  name text,
  public_key text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE cascade,
  credential_id text NOT NULL,
  counter integer NOT NULL,
  device_type text NOT NULL,
  backed_up boolean NOT NULL,
  transports text,
  created_at timestamp with time zone,
  aaguid text
);

CREATE INDEX IF NOT EXISTS user_passkey_user_id_idx ON user_passkey(user_id);
CREATE INDEX IF NOT EXISTS user_passkey_credential_id_idx ON user_passkey(credential_id);

CREATE TABLE IF NOT EXISTS user_device_code (
  id text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  device_code text NOT NULL,
  user_code text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE set null,
  expires_at timestamp with time zone NOT NULL,
  status text NOT NULL,
  last_polled_at timestamp with time zone,
  polling_interval integer,
  client_id text,
  scope text
);

CREATE INDEX IF NOT EXISTS user_device_code_user_code_idx ON user_device_code(user_code);
CREATE INDEX IF NOT EXISTS user_device_code_device_code_idx ON user_device_code(device_code);

CREATE TABLE IF NOT EXISTS user_jwks (
  id text PRIMARY KEY NOT NULL DEFAULT gen_random_uuid()::text,
  public_key text NOT NULL,
  private_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone
);

ALTER TABLE IF EXISTS user_session
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE IF EXISTS user_account
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE IF EXISTS user_verification
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE IF EXISTS user_passkey
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE IF EXISTS user_device_code
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
