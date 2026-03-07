# Auth Integration Testing

This document defines the deterministic setup for email OTP and passkey integration tests.

## Infrastructure

Start required services:

```bash
make auth-test-up
```

Stop services:

```bash
make auth-test-down
```

Check service status:

```bash
make auth-test-status
```

## Required Environment

Set these in test/e2e environments:

- `AUTH_TEST_OTP_ENABLED=true`
- `AUTH_TEST_OTP_TTL_SECONDS=300`
- `AUTH_E2E_SECRET=<shared-secret>`
- `AUTH_E2E_ENABLED=true`

## Deterministic OTP Retrieval Contract

OTP capture is test-only and disabled in production.

Endpoint:

- `GET /api/auth/test/otp/latest?email=<email>[&type=<otp-type>]`
- Header: `x-e2e-auth-secret: <AUTH_E2E_SECRET>`

Success response:

```json
{
  "email": "user@hominem.test",
  "otp": "123456",
  "type": "sign-in",
  "createdAt": 1700000000000,
  "expiresAt": 1700000300000
}
```

Failure behavior:

- `404` when disabled or OTP not found
- `403` when secret is invalid

## Shared Harness

Use shared helpers under `tests/auth-harness`:

- `otp.ts`: fetch latest OTP from test contract
- `session.ts`: fetch and assert session state
- `identities.ts`: generate deterministic test identities
- `passkey.ts`: setup/teardown virtual WebAuthn authenticators for Playwright
