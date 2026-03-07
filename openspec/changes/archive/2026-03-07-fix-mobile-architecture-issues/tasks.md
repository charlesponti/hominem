## Status Rebaseline (2026-03-06)

- [x] Foundation refactors landed for auth state machine, chat consolidation baseline, validation schemas, and error boundary wiring.
- [x] Initial cleanup landed for duplicate guards, effect cleanup, and storage simplification.
- [x] This change is now re-scoped to forward-only completion (no dual-path rollout, no backward-compat tasks).

## 1. Shared Integration Scaffolding

- [x] 1.1 Create shared mobile integration test harness for providers, query client, and deterministic auth/test controls.
- [x] 1.2 Add reusable fixtures/builders for auth session states, chat threads, and offline network states.
- [x] 1.3 Add shared assertions/helpers for route transitions, loading states, and retry/backoff behavior.
- [x] 1.4 Remove duplicate setup logic from existing mobile auth/chat integration tests.

## 2. Auth Contract Tests (RED)

- [x] 2.1 Add integration test: boot resolves to signed-out when no session exists.
- [x] 2.2 Add integration test: boot resolves to signed-in when valid session exists.
- [x] 2.3 Add integration test: concurrent sign-in requests do not produce inconsistent state.
- [x] 2.4 Add integration test: concurrent sign-out during in-flight auth request resolves deterministically.
- [x] 2.5 Add integration test: deep link to protected route during auth boot resolves without redirect loops.
- [x] 2.6 Add integration test: guarded navigation transitions remain loop-free and idempotent.

## 3. Auth and Routing Completion (GREEN)

- [x] 3.1 Patch auth state handling to satisfy 2.1-2.6.
- [x] 3.2 Remove any remaining duplicate/legacy auth guard code paths.
- [x] 3.3 Verify root-layout-only guard architecture with no fallback shims.
- [x] 3.4 Remove OAuth auth routes/bridges and lock runtime auth surface to email+OTP + passkey.

## 4. Chat and Offline Contract Tests (RED)

- [x] 4.1 Add integration test: send message optimistic state followed by server reconcile.
- [x] 4.2 Add integration test: streaming response updates are ordered and deterministic.
- [x] 4.3 Add integration test: chat persistence round-trip survives app reload.
- [x] 4.4 Add integration test: offline send queues/retries correctly and converges after reconnect.
- [x] 4.5 Add integration test: failed send/stream enters recoverable error state with retry.

## 5. Chat and Offline Completion (GREEN)

- [x] 5.1 Patch chat flow to satisfy 4.1-4.5.
- [x] 5.2 Remove stale chat state paths, obsolete hooks, and superseded persistence branches.
- [x] 5.3 Confirm single source-of-truth behavior for chat state and cache updates.

## 6. Error Boundary and Failure Isolation

- [x] 6.1 Add integration tests that throw in chat/focus/auth feature boundaries and assert graceful fallback behavior.
- [x] 6.2 Add integration test that validates root boundary recovery path for uncaught render failures.
- [x] 6.3 Verify error boundary logging path emits structured events without crashing app flow.

## 7. Storage and Query Reliability

- [x] 7.1 Decide and enforce one query persistence strategy (explicitly enabled or explicitly disabled) with rationale in docs.
- [x] 7.2 Add integration coverage for offline/online transition cache behavior under the chosen strategy.
- [x] 7.3 Remove unused native/storage references left by prior architecture.

## 8. Performance Gates

- [x] 8.1 Capture startup timing baseline and post-change timing with identical test conditions.
- [x] 8.2 Capture chat interaction latency baseline and post-change timing.
- [x] 8.3 Capture focus list scroll performance baseline and post-change timing.
- [x] 8.4 Document thresholds and results in a performance note under this change.

## 9. Device Validation

- [x] 9.1 Run complete auth/chat smoke path on physical iOS device.
- [x] 9.2 Confirm Android is out of scope for this product and remove Android validation requirement from this change.
- [x] 9.3 Log observed iOS physical-run issues and patch regressions before final gate run.

## 10. Final Gates and Archive

- [x] 10.1 Run `bun run --filter @hominem/mobile test` for mobile suites.
- [x] 10.2 Run `bun run test:e2e:auth:mobile`.
- [x] 10.3 Run `bun run typecheck`.
- [x] 10.4 Run `bun run lint --parallel`.
- [x] 10.5 Run `bun run check`.
- [x] 10.6 Update proposal/design/tasks with final evidence and results.
- [x] 10.7 Archive `fix-mobile-architecture-issues`.

## 11. Mobile Auth Stabilization (Single-Token Next Pass)

- [x] 11.1 Implement staged auth phases: `minting_api_token` and `syncing_profile`.
- [x] 11.2 Refactor boot path to prefer stored API JWT + protected probe before mint attempts.
- [x] 11.3 Ensure API token mint is single-flight and race-safe.
- [x] 11.4 Extract `bootSession` into a testable `runAuthBoot(deps)` pure async function. Add vitest unit tests: (a) valid stored token + 200 probe → SESSION_LOADED, (b) 401 probe → tokens cleared → SESSION_EXPIRED, (c) network error → tokens preserved → SESSION_EXPIRED, (d) timeout → SESSION_EXPIRED.
- [x] 11.5 Fix staged event dispatch: `verifyEmailOtp` emits API_TOKEN_MINT_STARTED → PROFILE_SYNC_STARTED → SESSION_LOADED; OTP_VERIFICATION_FAILED on error (not SYNC_FAILED). `signOut` dispatches SIGN_OUT_REQUESTED before async ops. `completePasskeySignIn` emits PROFILE_SYNC_STARTED before SESSION_LOADED.
- [x] 11.6 Create `utils/auth/auth-event-log.ts`: structured in-process event recorder (`{ event, phase, timestamp, durationMs }`). Wire into `auth-provider.tsx` at each phase transition. Add `auth_boot_start` / `auth_boot_resolved` marks to startup-metrics. Add budget tests: stored-token path < 500ms, cold path < 100ms.
- [x] 11.7 Run physical iOS smoke: sign-in -> force-quit -> reopen -> sign-out.

## 12. Auth Provider Performance

- [x] 12.1 Parallelize `SecureStore.getItemAsync` calls at boot with `Promise.all([getItemAsync(ACCESS_KEY), getItemAsync(REFRESH_KEY), getItemAsync(EXPIRES_AT_KEY)])`.
- [x] 12.2 Apply `AUTH_BOOT_TIMEOUT_MS` (8000ms) to `bootSession` via `setTimeout` + `AbortController`. Dispatch `SESSION_EXPIRED` on timeout.
- [x] 12.3 Add synchronous `isBootingRef` flag set before the first `await` in `bootSession` to prevent concurrent boot invocations (fixes TOCTOU race).
- [x] 12.4 Remove `authClient.useSession()` and the `isSessionPending` dependency from `AuthProvider`. Boot path uses stored-token probe only.
- [x] 12.5 Store `expiresAt = Date.now() + expiresIn * 1000` in SecureStore alongside tokens at sign-in time. In `getAccessToken`, check expiry: if token expires within 60s attempt refresh; dispatch REFRESH_STARTED / REFRESH_FAILED / SESSION_LOADED accordingly.

## 13. Auth Provider Correctness

- [x] 13.1 Fix `resolveAuthRedirect`: add `signing_out` to the no-redirect guard (same treatment as `booting`).
- [x] 13.2 Fix `useMobilePasskeyAuth`: replace hardcoded `isSupported = true` with real capability detection (iOS 16+).
- [x] 13.3 Remove `deleteAccount` from `AuthContextType` and `AuthProvider` value.
- [x] 13.4 Remove `Alert.alert('Sign in failed', ...)` from `verify.tsx`. Inline `authError` state is the sole error feedback path.
- [x] 13.5 Remove dead code: `mapAuthStatus` (identity function), `extractSessionAccessToken` (unreachable from provider). Remove the corresponding no-op unit tests.

## 14. Test Coverage

- [x] 14.1 Add route guard unit tests for all intermediate states: `signing_out` → no redirect; `verifying_otp` / `minting_api_token` / `syncing_profile` on protected group → redirect to `/(auth)`; `degraded` / `terminal_error` on protected group → redirect; `degraded` on auth group → no redirect.
- [x] 14.2 Add screen test for OTP verify failure: rejected `verifyEmailOtp` → inline error shown, submit button re-enabled.
- [x] 14.3 Add screen tests asserting submit button is disabled during in-flight `requestEmailOtp` and `verifyEmailOtp` calls.
- [x] 14.4 Fix `isValidOtp('1234567')` test: split into explicit normalization-contract test.
- [x] 14.5 Add `test:integration` script running all `tests/integration/` files. Updated `test:auth` to use it in the PR gate.

## 15. E2E Quality

- [x] 15.1 Replace `setTimeout` polling loop in `fetchLatestOtp` with exponential backoff helper (50ms → 100ms → 200ms → ... capped at 2000ms).
- [x] 15.2 Apply backoff helper to `waitForOtpStep`, `triggerOtpRequest`, and `dismissBlockingAlertIfPresent`. Remove all bare `setTimeout` polling.
- [x] 15.3 Rewrite smoke test as single deterministic assertion: clean install → `waitForAuthState('signed_out', 5000)`.
