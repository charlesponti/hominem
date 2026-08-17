-- +goose Up
-- +goose StatementBegin

-- Better Auth 1.7 OAuth Provider changed the OAuth schema and token model.
-- Keep the old data isolated for rollback investigation, but intentionally do
-- not copy clients or tokens: every MCP client must register and authorize again.
ALTER TABLE IF EXISTS "oauthApplication" RENAME TO "oauthApplication_legacy_20260817";
ALTER TABLE IF EXISTS "oauthAccessToken" RENAME TO "oauthAccessToken_legacy_20260817";
ALTER TABLE IF EXISTS "oauthConsent" RENAME TO "oauthConsent_legacy_20260817";

ALTER INDEX IF EXISTS oauth_application_user_id_idx RENAME TO oauth_application_legacy_user_id_idx;
ALTER INDEX IF EXISTS oauth_access_token_client_id_idx RENAME TO oauth_access_token_legacy_client_id_idx;
ALTER INDEX IF EXISTS oauth_access_token_user_id_idx RENAME TO oauth_access_token_legacy_user_id_idx;
ALTER INDEX IF EXISTS oauth_consent_client_id_idx RENAME TO oauth_consent_legacy_client_id_idx;
ALTER INDEX IF EXISTS oauth_consent_user_id_idx RENAME TO oauth_consent_legacy_user_id_idx;

ALTER TABLE jwks ADD COLUMN IF NOT EXISTS alg TEXT;
ALTER TABLE jwks ADD COLUMN IF NOT EXISTS crv TEXT;

CREATE TABLE "oauthClient" (
  id TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL UNIQUE,
  "clientSecret" TEXT,
  "clientDiscoveryId" TEXT,
  disabled BOOLEAN NOT NULL DEFAULT false,
  "skipConsent" BOOLEAN,
  "enableEndSession" BOOLEAN,
  "subjectType" TEXT,
  scopes TEXT,
  "clientCredentialsScopes" TEXT,
  "userId" TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT,
  uri TEXT,
  icon TEXT,
  contacts TEXT,
  tos TEXT,
  policy TEXT,
  "softwareId" TEXT,
  "softwareVersion" TEXT,
  "softwareStatement" TEXT,
  "redirectUris" TEXT NOT NULL,
  "postLogoutRedirectUris" TEXT,
  "backchannelLogoutUri" TEXT,
  "backchannelLogoutSessionRequired" BOOLEAN,
  "tokenEndpointAuthMethod" TEXT,
  "applicationType" TEXT,
  jwks TEXT,
  "jwksUri" TEXT,
  "grantTypes" TEXT,
  "responseTypes" TEXT,
  "requirePKCE" BOOLEAN,
  "dpopBoundAccessTokens" BOOLEAN NOT NULL DEFAULT false,
  "referenceId" TEXT,
  metadata JSONB
);

CREATE INDEX oauth_client_user_id_idx ON "oauthClient" ("userId");

CREATE TABLE "oauthResource" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  "accessTokenTtl" INTEGER,
  "refreshTokenTtl" INTEGER,
  "signingAlgorithm" TEXT,
  "signingKeyId" TEXT,
  "allowedScopes" TEXT,
  "customClaims" JSONB,
  "dpopBoundAccessTokensRequired" BOOLEAN NOT NULL DEFAULT false,
  disabled BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "policyVersion" INTEGER NOT NULL DEFAULT 1,
  metadata JSONB
);

CREATE TABLE "oauthClientResource" (
  id TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL REFERENCES "oauthClient"("clientId") ON DELETE CASCADE,
  "resourceId" TEXT NOT NULL REFERENCES "oauthResource"(identifier) ON DELETE CASCADE,
  metadata JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("clientId", "resourceId")
);

CREATE INDEX oauth_client_resource_client_id_idx ON "oauthClientResource" ("clientId");
CREATE INDEX oauth_client_resource_resource_id_idx ON "oauthClientResource" ("resourceId");

CREATE TABLE "oauthRefreshToken" (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  "clientId" TEXT NOT NULL REFERENCES "oauthClient"("clientId"),
  "sessionId" TEXT REFERENCES "session"(id) ON DELETE SET NULL,
  "userId" TEXT NOT NULL REFERENCES "user"(id),
  "referenceId" TEXT,
  "authorizationCodeId" TEXT,
  resources TEXT,
  "requestedUserInfoClaims" TEXT,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked TIMESTAMPTZ,
  "rotatedAt" TIMESTAMPTZ,
  "rotationReplayResponse" TEXT,
  "rotationReplayExpiresAt" TIMESTAMPTZ,
  "authTime" TIMESTAMPTZ,
  confirmation JSONB,
  scopes TEXT NOT NULL
);

CREATE INDEX oauth_refresh_token_client_id_idx ON "oauthRefreshToken" ("clientId");
CREATE INDEX oauth_refresh_token_session_id_idx ON "oauthRefreshToken" ("sessionId");
CREATE INDEX oauth_refresh_token_user_id_idx ON "oauthRefreshToken" ("userId");
CREATE INDEX oauth_refresh_token_authorization_code_id_idx ON "oauthRefreshToken" ("authorizationCodeId");

CREATE TABLE "oauthAccessToken" (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  "clientId" TEXT NOT NULL REFERENCES "oauthClient"("clientId"),
  "sessionId" TEXT REFERENCES "session"(id) ON DELETE SET NULL,
  "userId" TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  "referenceId" TEXT,
  "authorizationCodeId" TEXT,
  resources TEXT,
  "requestedUserInfoClaims" TEXT,
  "refreshId" TEXT REFERENCES "oauthRefreshToken"(id),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked TIMESTAMPTZ,
  confirmation JSONB,
  scopes TEXT NOT NULL
);

CREATE INDEX oauth_access_token_client_id_idx ON "oauthAccessToken" ("clientId");
CREATE INDEX oauth_access_token_session_id_idx ON "oauthAccessToken" ("sessionId");
CREATE INDEX oauth_access_token_user_id_idx ON "oauthAccessToken" ("userId");
CREATE INDEX oauth_access_token_authorization_code_id_idx ON "oauthAccessToken" ("authorizationCodeId");
CREATE INDEX oauth_access_token_refresh_id_idx ON "oauthAccessToken" ("refreshId");

CREATE TABLE "oauthConsent" (
  id TEXT PRIMARY KEY,
  "clientId" TEXT NOT NULL REFERENCES "oauthClient"("clientId"),
  "userId" TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  "referenceId" TEXT,
  resources TEXT,
  "requestedUserInfoClaims" TEXT,
  scopes TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX oauth_consent_client_id_idx ON "oauthConsent" ("clientId");
CREATE INDEX oauth_consent_user_id_idx ON "oauthConsent" ("userId");

CREATE TABLE "oauthClientAssertion" (
  id TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL
);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS "oauthClientAssertion";
DROP TABLE IF EXISTS "oauthConsent";
DROP TABLE IF EXISTS "oauthAccessToken";
DROP TABLE IF EXISTS "oauthRefreshToken";
DROP TABLE IF EXISTS "oauthClientResource";
DROP TABLE IF EXISTS "oauthResource";
DROP TABLE IF EXISTS "oauthClient";
ALTER TABLE IF EXISTS "oauthApplication_legacy_20260817" RENAME TO "oauthApplication";
ALTER TABLE IF EXISTS "oauthAccessToken_legacy_20260817" RENAME TO "oauthAccessToken";
ALTER TABLE IF EXISTS "oauthConsent_legacy_20260817" RENAME TO "oauthConsent";
ALTER INDEX IF EXISTS oauth_application_legacy_user_id_idx RENAME TO oauth_application_user_id_idx;
ALTER INDEX IF EXISTS oauth_access_token_legacy_client_id_idx RENAME TO oauth_access_token_client_id_idx;
ALTER INDEX IF EXISTS oauth_access_token_legacy_user_id_idx RENAME TO oauth_access_token_user_id_idx;
ALTER INDEX IF EXISTS oauth_consent_legacy_client_id_idx RENAME TO oauth_consent_client_id_idx;
ALTER INDEX IF EXISTS oauth_consent_legacy_user_id_idx RENAME TO oauth_consent_user_id_idx;
-- +goose StatementEnd
