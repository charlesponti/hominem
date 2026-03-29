-- +goose Up
-- +goose StatementBegin

-- Better Auth native schema (public schema, native table/column names)
-- Do NOT manually edit these tables — they are owned by Better Auth.

CREATE TABLE "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  image TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE account (
  id TEXT PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE verification (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE jwks (
  id TEXT PRIMARY KEY,
  "publicKey" TEXT NOT NULL,
  "privateKey" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL,
  "expiresAt" TIMESTAMPTZ
);

CREATE TABLE passkey (
  id TEXT PRIMARY KEY,
  name TEXT,
  "publicKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "credentialID" TEXT NOT NULL UNIQUE,
  counter INTEGER NOT NULL DEFAULT 0,
  "deviceType" TEXT NOT NULL,
  "backedUp" BOOLEAN NOT NULL DEFAULT false,
  transports TEXT,
  "createdAt" TIMESTAMPTZ,
  aaguid TEXT
);

CREATE TABLE "deviceCode" (
  id TEXT PRIMARY KEY,
  "deviceCode" TEXT NOT NULL UNIQUE,
  "userCode" TEXT NOT NULL UNIQUE,
  "userId" TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  "lastPolledAt" TIMESTAMPTZ,
  "pollingInterval" INTEGER,
  "clientId" TEXT,
  scope TEXT
);

CREATE INDEX session_user_id_idx ON session ("userId");
CREATE INDEX account_user_id_idx ON account ("userId");
CREATE INDEX passkey_user_id_idx ON passkey ("userId");
CREATE INDEX device_code_user_id_idx ON "deviceCode" ("userId");

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "deviceCode";
DROP TABLE IF EXISTS passkey;
DROP TABLE IF EXISTS jwks;
DROP TABLE IF EXISTS verification;
DROP TABLE IF EXISTS account;
DROP TABLE IF EXISTS session;
DROP TABLE IF EXISTS "user";
-- +goose StatementEnd
