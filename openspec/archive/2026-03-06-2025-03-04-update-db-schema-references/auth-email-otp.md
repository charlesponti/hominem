# Email + OTP Authentication (Web)

This document describes the current email + OTP authentication system in Hominem, with explicit production, development, and E2E behavior.

## System Overview

Email + OTP uses Better Auth's `emailOTP` plugin behind custom API routes:

- API route to send OTP: `POST /api/auth/email-otp/send`
- API route to verify OTP: `POST /api/auth/email-otp/verify`
- Better Auth plugin endpoints proxied by the route layer:
  - `/email-otp/send-verification-otp`
  - `/sign-in/email-otp`

Finance web app flow:

1. User opens `/auth/email`
2. App submits email to `/api/auth/email-otp/send`
3. API calls Better Auth OTP send endpoint
4. User receives OTP (or test store captures OTP)
5. User submits OTP to `/api/auth/email-otp/verify`
6. API verifies through Better Auth, then injects signed API access token (`token`, `accessToken`, `expiresIn`) in response JSON
7. Finance app stores `hominem_access_token` cookie and forwards Better Auth cookies
8. App redirects user to `/finance`

## Production

### What happens in production

- OTP send/verify is mediated by API auth routes in `services/api/src/routes/auth.ts`.
- Better Auth plugin manages OTP generation and verification.
- Email delivery uses `sendEmail` with Resend configuration.
- OTP expiry is controlled by `AUTH_EMAIL_OTP_EXPIRES_SECONDS`.
- Session continuity relies on Better Auth cookies plus API access token for app/API usage.

### Production-critical environment

- `BETTER_AUTH_URL`
- `BETTER_AUTH_SECRET`
- `AUTH_EMAIL_OTP_EXPIRES_SECONDS`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_FROM_NAME`
- `FINANCE_URL`, `NOTES_URL`, `ROCCO_URL` (trusted origins)
- `AUTH_COOKIE_DOMAIN` (optional cross-subdomain cookies)

### Security model

- OTP verify route validates request shape with Zod.
- On successful verify, API issues a signed JWT access token with explicit claims (`sub`, `sid`, `scope`, `role`, `amr=['email_otp']`).
- Better Auth session cookies remain authoritative for Better Auth plugin/session APIs.
- Test-only OTP retrieval endpoint is not part of production behavior.

## Development

### Local app flow

- Finance UI routes:
  - `/auth/email` posts to `/api/auth/email-otp/send`
  - `/auth/email/verify` posts to `/api/auth/email-otp/verify`
- On successful verify, finance route action:
  - forwards upstream `set-cookie` headers from API verify
  - optionally fetches `/api/auth/session` using those cookies
  - writes `hominem_access_token` as HttpOnly cookie
  - redirects to `/finance`

### Development conveniences and fallbacks

- In test/dev flows, if a direct `accessToken` is not available from session lookup, action can use `/api/auth/dev/issue-token` with verified user id.
- This fallback is development/test convenience and should not be treated as primary production path.

### Local configuration patterns

Common local values:

- `BETTER_AUTH_URL=http://localhost:4040`
- app URLs on localhost ports (`4444`, `4445`, `4446`)
- short OTP expiries can be used for expiry-path testing (`AUTH_EMAIL_OTP_EXPIRES_SECONDS=2` in Playwright setup)

## E2E Tests

### Current E2E coverage

Primary test file:

- `apps/finance/tests/auth.email-otp.spec.ts`

Covered scenarios:

- Success path: request OTP, verify OTP, redirect to `/finance`
- Invalid OTP rejection: remains on verify route with error
- Expired OTP rejection: remains on verify route with error

Gate command:

- `bun run test:e2e:auth:app`

### Test OTP retrieval contract

For deterministic OTP tests, API exposes a test-only endpoint:

- `GET /api/auth/test/otp/latest?email=<email>&type=sign-in`
- Required header: `x-e2e-auth-secret: <AUTH_E2E_SECRET>`

Behavior:

- `403` if secret invalid
- `404` if disabled or OTP not found
- Returns latest OTP metadata when enabled

### Required E2E env flags

- `AUTH_TEST_OTP_ENABLED=true`
- `AUTH_E2E_SECRET=<shared-secret>`
- `AUTH_EMAIL_OTP_EXPIRES_SECONDS` tuned for expiry tests
- test DB and API stack running

## Source References

- `services/api/src/auth/better-auth.ts`
- `services/api/src/routes/auth.ts`
- `services/api/src/env.ts`
- `apps/finance/app/routes/auth/email.tsx`
- `apps/finance/app/routes/auth/email.verify.tsx`
- `apps/finance/tests/auth.email-otp.spec.ts`
- `tests/auth-harness/otp.ts`
