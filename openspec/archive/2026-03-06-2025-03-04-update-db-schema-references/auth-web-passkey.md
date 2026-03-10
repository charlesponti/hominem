# Web Passkey Authentication (WebAuthn)

This document describes the current web passkey authentication system in Hominem, with explicit production, development, and E2E behavior.

## System Overview

Passkey auth is powered by Better Auth `passkey` plugin and custom API route wrappers.

Core API routes:

- `POST /api/auth/passkey/auth/options`
- `POST /api/auth/passkey/auth/verify`
- `POST /api/auth/passkey/register/options`
- `POST /api/auth/passkey/register/verify`

Better Auth plugin endpoints proxied internally:

- `/passkey/generate-authenticate-options`
- `/passkey/verify-authentication`
- `/passkey/generate-register-options`
- `/passkey/verify-registration`

Client runtime (`packages/auth/src/client.tsx`) uses WebAuthn browser APIs:

- `navigator.credentials.get(...)` for sign-in/step-up
- `navigator.credentials.create(...)` for registration

## Production

### What happens in production

- Better Auth is configured with passkey plugin (`rpID`, `rpName`, allowed origins, custom model mapping).
- Web app requests options from API wrapper routes.
- Browser executes WebAuthn ceremony using options payload.
- Browser assertion/attestation response is serialized and posted to verify route.
- Better Auth verifies credential proof and updates session state.

### Production-critical configuration

From `services/api/src/auth/better-auth.ts` and env:

- RP ID: derived from `new URL(BETTER_AUTH_URL).hostname`
- Passkey origin allowlist includes app origins (`BETTER_AUTH_URL`, `FINANCE_URL`, `NOTES_URL`, `ROCCO_URL`)
- Trusted origins configured for cross-app auth consistency
- Secure cookie behavior tied to production/HTTPS

### Security model

- Register verify requires authenticated user context (`401` if missing).
- Auth verify can be used for sign-in and for step-up actions.
- Step-up action flow stores a short-lived authorization grant after successful passkey verify.
- API wrapper validates body shape and maps failures to explicit auth errors.

## Development

### Local passkey behavior

- Works on localhost with configured local origins.
- `AuthProvider.signInWithPasskey()` flow:
  1. POST `/api/auth/passkey/auth/options`
  2. call `navigator.credentials.get`
  3. POST assertion to `/api/auth/passkey/auth/verify`
  4. refresh session via `/api/auth/session`

- `AuthProvider.addPasskey(name?)` flow:
  1. POST `/api/auth/passkey/register/options`
  2. call `navigator.credentials.create`
  3. POST attestation/assertion to `/api/auth/passkey/register/verify`

### Development guardrails

- If browser lacks `PublicKeyCredential`, client throws explicit error.
- Invalid options payloads fail early in client with clear errors.
- Verify endpoint errors propagate as user-facing auth failures (sign-in/registration/step-up).

## E2E Tests

### Current status

- Shared passkey test harness exists:
  - `tests/auth-harness/passkey.ts`
- It sets up a virtual WebAuthn authenticator in Chromium via CDP:
  - `WebAuthn.enable`
  - `WebAuthn.addVirtualAuthenticator`
  - `WebAuthn.removeVirtualAuthenticator`
- Web app passkey E2E spec is implemented:
  - `apps/finance/tests/auth.passkey.spec.ts`
  - covers passkey registration and passkey sign-in to protected `/finance`
  - executes through gate command `bun run test:e2e:auth:app`

### How E2E passkey tests should run

1. Boot API + app + test DB stack.
2. In Playwright test, install virtual authenticator via `setupVirtualPasskey(context, page)`.
3. Execute app passkey flow (sign-in and registration where needed).
4. Assert authenticated app state and protected route access.
5. Tear down virtual authenticator via `teardownVirtualPasskey(...)`.

### Required assertions for passkey E2E

- Options endpoint returns valid WebAuthn challenge payload.
- Verify endpoint accepts valid browser assertion and establishes session.
- App reaches authenticated protected view after passkey sign-in.
- Invalid/failed passkey verification remains unauthenticated.
- Step-up action grants only after successful passkey verification.

### Planned gate integration

- Keep passkey suite under the same app-auth E2E gate command:
  - `bun run test:e2e:auth:app`

## Source References

- `services/api/src/auth/better-auth.ts`
- `services/api/src/routes/auth.ts`
- `services/api/src/env.ts`
- `packages/auth/src/client.tsx`
- `tests/auth-harness/passkey.ts`
- `docs/testing/auth-integration.md`
