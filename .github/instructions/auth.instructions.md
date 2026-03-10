---
applyTo: 'apps/**, packages/**, services/**, tools/**'
---

# Authentication

## Contract

- Better Auth is the identity layer.
- Protected API access uses explicit bearer tokens.
- Sign-in and refresh endpoints return credentials directly.
- Protected endpoints validate bearer tokens instead of relying on implicit session minting.

## Client Flow

1. Sign in with a supported method.
2. Receive `accessToken`, `refreshToken`, and expiry metadata.
3. Call protected routes with `Authorization: Bearer <token>`.
4. Refresh credentials through the shared refresh contract when needed.

## Supported Flows

### Email OTP

- `POST /api/better-auth/sign-in/email-otp`
- `POST /api/better-auth/email-otp/verify-otp`
- `POST /api/better-auth/email-otp/send-verification-otp`

### Passkey

- `POST /api/auth/passkey/auth/options`
- `POST /api/auth/passkey/auth/verify`
- `POST /api/auth/passkey/register/options`
- `POST /api/auth/passkey/register/verify`

### OAuth

- `GET /api/auth/authorize`
- `GET /api/auth/callback/apple`
- `GET /api/auth/callback/google`

### Mobile

- `POST /api/auth/mobile/authorize`
- `GET /api/auth/mobile/callback`
- `POST /api/auth/mobile/exchange`

### CLI

- `POST /api/auth/cli/authorize`
- `GET /api/auth/cli/callback`
- `POST /api/auth/cli/exchange`

## Session And Token Endpoints

- Identity: `GET /api/auth/session`
- Refresh: `POST /api/auth/refresh`
- Logout: `POST /api/auth/logout`

`/api/auth/session` is for identity state only. Do not treat it as a fallback token-minting path.

## Deterministic Testing

Infra commands:

```bash
make auth-test-up
make auth-test-status
make auth-test-down
```

Required environment:

- `AUTH_TEST_OTP_ENABLED=true`
- `AUTH_TEST_OTP_TTL_SECONDS=300`
- `AUTH_E2E_SECRET=<shared-secret>`
- `AUTH_E2E_ENABLED=true`

Test-only OTP retrieval:

- `GET /api/auth/test/otp/latest?email=<email>[&type=<otp-type>]`
- Header: `x-e2e-auth-secret: <AUTH_E2E_SECRET>`

Expected failures:

- `404` when disabled or missing
- `403` when the secret is invalid

Shared helpers live under `tests/auth-harness`.

## Rules

- Keep auth docs focused on the current contract, not migration history.
- Update this instruction file and the relevant OpenSpec artifacts together when auth behavior changes.
