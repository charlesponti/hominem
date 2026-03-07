# Mobile Auth State Contract

This document defines the canonical mobile authentication contract for this change. It is implementation-facing and test-facing.

## Why This Exists

Mobile auth has shown E2E instability caused by UI-driven state inference. The fix is to make auth behavior deterministic from first principles:

- one explicit state machine
- route decisions as a pure function of state
- deterministic E2E control plane
- no legacy wrappers/shims

## Principles (Locked)

1. Deterministic state
- The app must always be in exactly one auth state.
- State transitions are explicit and observable.

2. Single source of truth
- Session truth comes from Better Auth session + local projection, not parallel ad-hoc flags.

3. Idempotent auth actions
- OTP request, verify, and sign-out must be safe to retry.

4. State-driven routing
- Routing is derived from state, never inferred from screen text/labels.

5. Contract-first testing
- E2E asserts state/test hooks, not UI wording.
- Integration tests validate API + DB invariants.

## Canonical Auth States

- `booting`: startup resolution in progress
- `signed_out`: no valid session
- `otp_requested`: code send succeeded for a normalized email
- `verifying_otp`: OTP verification in-flight
- `signed_in`: valid session and local projection resolved
- `signing_out`: sign-out in-flight
- `degraded`: non-terminal failure, app can recover/retry
- `terminal_error`: unrecoverable configuration/runtime fault

## State Invariants

1. `signed_out`
- No active server session
- No local access token
- Auth entry route reachable

2. `signed_in`
- Valid session present from Better Auth
- User identity resolved
- Protected routes reachable

3. `booting`
- Duration budget: target <= 1200ms, hard timeout fallback <= 8000ms
- On timeout, transition to `signed_out` (never hang indefinitely)

4. `signing_out`
- Must end in `signed_out` even if server invalidation partially fails

## Transitions (Authoritative)

1. Startup
- `booting` -> `signed_in` when session resolves valid
- `booting` -> `signed_out` when no session
- `booting` -> `signed_out` on timeout fallback
- `booting` -> `terminal_error` only for fatal config faults

2. OTP request
- `signed_out` -> `otp_requested` on successful `requestOtp(email)`
- `signed_out` -> `degraded` on request failure

3. OTP verify
- `otp_requested` -> `verifying_otp` on verify submit
- `verifying_otp` -> `signed_in` on success
- `verifying_otp` -> `otp_requested` on invalid/expired OTP
- `verifying_otp` -> `degraded` on transient network/server failure

4. Sign-out
- `signed_in` -> `signing_out` on sign-out action
- `signing_out` -> `signed_out` (required terminal state)

5. Recovery
- `degraded` -> prior stable state on retry success
- `degraded` -> `signed_out` on reset

## Route Contract (Pure Function of State)

- `signed_out|otp_requested|verifying_otp|degraded` -> `/(auth)`
- `signed_in|signing_out` -> `/(drawer)` protected shell
- `booting` -> bootstrap shell only
- `terminal_error` -> fatal error route/screen

No route may infer auth state by checking arbitrary UI text.

## API Contract (No Shim Policy)

Use canonical Better Auth endpoints for session lifecycle where possible. Avoid parallel wrapper routes that duplicate semantics.

Required contracts:

- OTP send: stable endpoint with typed request/response and typed error codes
- OTP verify: Better Auth email OTP verify contract
- Session read: Better Auth session contract
- Sign-out: Better Auth sign-out contract

If a custom route exists, it must be documented as composition over Better Auth, not an alternative auth protocol.

## Security Contract

1. Storage
- Credentials/session artifacts stored only in secure OS-backed storage.
- No plaintext auth secrets in AsyncStorage.

2. OTP controls
- Strict TTL
- One-time use and replay rejection
- Rate limiting and abuse throttling

3. Environment gating
- Test-only endpoints disabled in production.
- E2E secrets required for test OTP helper endpoints.

4. Logging
- Never log OTP values or secret tokens.

## E2E Contract (Deterministic)

E2E must never depend on previous simulator/keychain state.

Required E2E controls for `APP_VARIANT=e2e`:

1. Deterministic reset hook
- Clears local auth artifacts and session projection.
- Guarantees baseline `signed_out`.

2. Deterministic state indicator
- Dedicated `testID` markers for state roots:
  - `auth-state-booting`
  - `auth-state-signed-out`
  - `auth-state-signed-in`

3. Deterministic OTP retrieval path (non-prod only)
- Test helper endpoint returns latest OTP for fixture email.
- Guarded by shared test secret.

4. Deterministic sign-out path
- Always available from any signed-in branch (tabs/onboarding/other protected branches).

## Test Strategy (Integration-First)

1. Unit tests
- State machine transitions
- Route guard mapping
- Input normalization/validation
- Timeout fallback behavior

2. Integration tests
- OTP send/verify/sign-out flows against API contracts
- Session persistence and restore behavior
- Error mapping invariants

3. E2E tests
- `signed_out -> otp_requested -> signed_in -> signed_out`
- invalid OTP rejection remains unauthenticated
- expired OTP rejection remains unauthenticated
- startup determinism from cold launch

## Observability Contract

Track and alert on:

- boot resolution duration (`booting` start -> resolved state)
- OTP send failure rate
- OTP verify failure rate
- auth state fallback timeout count
- sign-out completion latency

## Implementation Policy

1. No shims
- Do not add legacy alias/wrapper/dual-path auth flows.

2. Small focused modules
- State machine, route guard, and side-effect executors remain separated.

3. RED -> GREEN
- Add failing tests for each transition invariant before implementation changes.

## Research Basis

- Expo Router auth redirection and protected routes:
  - https://docs.expo.dev/router/advanced/authentication/
  - https://docs.expo.dev/router/advanced/authentication-rewrites/
- Expo SecureStore behavior and lifecycle:
  - https://docs.expo.dev/versions/latest/sdk/securestore/
- Better Auth hooks and Expo integration:
  - https://www.better-auth.com/docs/concepts/hooks
  - https://www.better-auth.com/docs/integrations/expo
  - https://www.better-auth.com/docs/plugins/email-otp
- OWASP MASVS mobile storage/auth guidance:
  - https://mas.owasp.org/MASVS/05-MASVS-STORAGE/
  - https://mas.owasp.org/MASWE/MASVS-STORAGE/MASWE-0006/
- NIST/IETF OTP guidance:
  - https://pages.nist.gov/800-63-4/sp800-63b.html
  - https://datatracker.ietf.org/doc/html/rfc6238
  - https://www.ietf.org/rfc/rfc4226.txt
- Passkey platform guidance:
  - https://developer.android.com/design/ui/mobile/guides/patterns/passkeys
  - https://developer.apple.com/passkeys/
- Detox best practices:
  - https://wix.github.io/Detox/docs/next/guide/test-id
  - https://wix.github.io/Detox/docs/next/api/matchers
