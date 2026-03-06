## Why

Authentication behavior is currently inconsistent across API and apps: email OTP request exists but verification UX is incomplete, passkey flows are partially wired, and provider assumptions remain Apple-centric in core paths. We need a single modern auth contract (email + OTP + passkey) with end-to-end coverage so sign-in is reliable and testable across Finance, Notes, and Rocco.

## What Changes

- Define a canonical auth contract for web apps using email OTP bootstrap and passkey-first return sign-in.
- Complete end-to-end email OTP flow: request code, verify code, establish session, and route users into authenticated app state.
- Complete passkey lifecycle flow: register (authenticated only), sign-in, and fallback to email OTP when passkey is unavailable.
- Remove legacy provider assumptions from session-subject mapping paths so non-OAuth auth methods are first-class.
- Add integration-first test architecture (API contract + browser integration) with shared auth test scaffolding and deterministic OTP capture.
- Standardize auth entry routes and callback behavior across Finance, Notes, and Rocco.

## Capabilities

### New Capabilities
- `auth-email-otp-passkey-contract`: Unified cross-app authentication capability covering email OTP bootstrap, passkey enrollment, passkey sign-in, and fallback behavior.
- `auth-integration-verification`: Integration-first verification capability covering API auth contracts, browser auth journeys, and shared auth test harness utilities.

### Modified Capabilities
- `auth-system-cleanup`: Expand requirements from provider cleanup-only to enforce method-agnostic subject/session mapping and cross-app route consistency for modern auth methods.

## Impact

- **API**: `services/api/src/auth/*`, `services/api/src/routes/auth.ts`, middleware/session mapping behavior.
- **Shared auth package**: `packages/auth` client/server contracts and provider typing.
- **Apps**: auth routes and sign-in UX in `apps/finance`, `apps/notes`, and `apps/rocco`.
- **Tests**: new/updated integration suites in API and app Playwright layers; shared auth test scaffolding.
- **Ops/CI**: auth test environment setup (test DB + Redis + deterministic OTP test plumbing) and stable gates for auth flows.
