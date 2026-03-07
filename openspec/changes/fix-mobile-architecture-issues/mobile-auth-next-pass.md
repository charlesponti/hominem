## Mobile Auth Next Pass (Single-Token Stabilization)

Date: 2026-03-06
Change: `fix-mobile-architecture-issues`

## Implementation Progress

Last updated: 2026-03-06 (in progress)

- [x] Added explicit auth phases in mobile state machine:
  - `minting_api_token`
  - `syncing_profile`
- [x] Added reducer transitions/events for staged token mint and profile sync.
- [x] Added single-flight sync generation guard in `AuthProvider` to avoid concurrent stale commits.
- [x] Added loop-prevention guard to stop repeated `/api/auth/session` mint calls on stable signed-in state.
- [x] Added boot preference for stored API JWT before session mint path.
- [x] Added API-session resolution path that can:
  - validate stored API JWT (`bearer` only),
  - mint API JWT from Better Auth session context (`credentials: include` + optional bearer).
- [x] Updated E2E auth-state indicator mapping to include new intermediate statuses.
- [ ] Add explicit protected-token bootstrap probe integration tests.
- [ ] Add explicit cold-reopen valid/invalid token integration tests.
- [ ] Complete physical iOS verify cycle after state machine stabilization.

### Current runtime note

- During implementation validation, API logs still showed high-frequency `/api/auth/session` traffic from the currently running mobile runtime.
- This needs clean app runtime restart and post-reload verification to confirm the new loop guard behavior is active.

## Problem Statement

Mobile auth currently behaves inconsistently across three moments:

1. OTP sign-in submit
2. Post-verify transition into protected RPC calls
3. Cold app reopen after a prior successful sign-in

The observed failure `Unable to mint API access token from session` can happen:
- immediately after OTP verify, or
- immediately on app reopen without user action.

This indicates auth state orchestration is still coupling two credential systems and doing asynchronous mint/sync work at unstable times.

## Why Current Flow Is Broken

### 1) Dual credential semantics still leak into runtime

- Better Auth session context is used for identity lifecycle.
- API JWT is required for protected RPC routes.
- Mobile startup/sync currently attempts to derive API JWT from Better Auth session repeatedly and opportunistically.

Result:
- timing races between session availability, cookie propagation, and route-guard transitions.
- a signed-in identity can exist while API JWT is missing, expired, or not yet minted.

### 2) Boot path performs non-idempotent mint work

Current boot/sync effect performs:
- session inspection
- local user sync
- API token mint attempt

This all runs while render/navigation state is active. On reopen, mint can fail transiently and app reports terminal-looking error before recovery paths.

### 3) Error handling conflates stage failures

`Unable to mint API...` is surfaced as a generic auth error. It does not distinguish:
- verify success + mint failed
- mint success + storage write failed
- mint success + first protected request failed

Without stage-specific telemetry, user-visible behavior looks random.

## Desired End State

### Contract

1. `/api/auth/*` is identity/session surface.
2. protected `/api/*` routes accept only API JWT.
3. mobile uses only API JWT for RPC authorization.

### State machine requirements

Auth flow must include explicit phases:

- `booting`
- `signed_out`
- `otp_requested`
- `verifying_otp`
- `minting_api_token`
- `syncing_profile`
- `signed_in`
- `signing_out`
- `degraded`

### Boot behavior requirements

On app reopen:

1. Load API JWT from secure storage first.
2. If present, run a lightweight token validity probe on one protected endpoint.
3. If probe succeeds, enter `signed_in` without forcing immediate Better Auth mint call.
4. If probe fails with 401, clear token and transition to `signed_out`.
5. Only mint API JWT from Better Auth session when:
   - explicit sign-in just succeeded, or
   - no API JWT exists but Better Auth session is confirmed.

### Navigation requirements

- Route guard must not transition to protected app shell until phase is `signed_in`.
- `minting_api_token` and `syncing_profile` must keep auth surface visible with deterministic loading.
- No redirect loops between auth/protected groups.

## Target Flow (Happy Path)

1. User enters email and OTP.
2. `/api/auth/sign-in/email-otp` returns success (Better Auth session established).
3. Mobile enters `minting_api_token`.
4. Mobile calls `/api/auth/session` exactly once for this transition.
5. API returns `accessToken`.
6. Mobile stores token in secure storage and in-memory ref.
7. Mobile enters `syncing_profile` and persists merged user profile.
8. Mobile enters `signed_in`.
9. First protected RPC request uses API JWT and returns `200`.

## Target Flow (Cold Reopen)

1. App loads stored API JWT.
2. App probes protected endpoint (`/api/notes` or lightweight protected status probe).
3. If `200`, app enters `signed_in` immediately.
4. If `401 invalid_token`, clear token and enter `signed_out`.
5. Optional Better Auth session reconciliation happens in background, not as a blocking foreground error.

## Implementation Plan (Next Pass)

1. Refactor mobile auth reducer/types to include explicit `minting_api_token` and `syncing_profile`.
2. Split current sync effect into staged commands:
   - `bootstrapFromStoredToken`
   - `mintTokenFromSession`
   - `syncLocalProfile`
3. Introduce one orchestration guard:
   - never run concurrent mint operations.
   - ignore stale responses from prior attempt.
4. Persist API JWT as source of truth:
   - secure storage key
   - memory cache
   - clear on sign-out and 401 probe failure
5. Add protected probe util used only during boot to validate stored token.
6. Keep `/api/auth/*` middleware bypass and strict protected JWT enforcement.
7. Remove remaining implicit dependency on Better Auth session token for RPC.

## Test Plan (Required)

### Integration tests (mobile)

1. `cold_reopen_with_valid_api_token_enters_signed_in`
2. `cold_reopen_with_invalid_api_token_clears_and_enters_signed_out`
3. `otp_verify_then_mint_then_first_protected_call_succeeds`
4. `mint_failure_keeps_user_in_auth_surface_without_redirect_loop`
5. `concurrent_mint_attempts_resolve_to_single_committed_token`

### API tests

1. protected routes reject non-API bearer token with `invalid_token`.
2. `/api/auth/session` returns API JWT when Better Auth session exists.
3. `/api/auth/*` routes do not recurse through auth middleware.

### Device validation

1. sign-in flow on physical iOS succeeds end-to-end.
2. force quit + reopen enters signed-in without `Unable to mint API...`.
3. sign-out then reopen remains signed-out.

## Observability Requirements

Add structured mobile auth stage logs (dev + e2e builds):

- `auth_stage_bootstrap_token`
- `auth_stage_verify_otp`
- `auth_stage_mint_api_token`
- `auth_stage_sync_profile`
- `auth_stage_first_protected_probe`

Error payload must include stage key and normalized reason code:

- `verify_failed`
- `mint_failed`
- `token_probe_failed`
- `profile_sync_failed`

## Definition Of Done (Next Pass)

1. No `Unable to mint API...` on successful sign-in or cold reopen.
2. No `invalid_token` on first protected RPC call after successful sign-in.
3. Cold reopen works with existing valid API token.
4. All listed integration/API tests pass.
5. Physical iOS smoke confirms stable sign-in -> reopen -> sign-out cycle.
