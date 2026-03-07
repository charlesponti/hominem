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

- [ ] 9.1 Run complete auth/chat smoke path on physical iOS device.
- [x] 9.2 Confirm Android is out of scope for this product and remove Android validation requirement from this change.
- [x] 9.3 Log observed iOS physical-run issues and patch regressions before final gate run.

## 10. Final Gates and Archive

- [x] 10.1 Run `bun run --filter @hominem/mobile test` for mobile suites.
- [x] 10.2 Run `bun run test:e2e:auth:mobile`.
- [x] 10.3 Run `bun run typecheck`.
- [x] 10.4 Run `bun run lint --parallel`.
- [x] 10.5 Run `bun run check`.
- [x] 10.6 Update proposal/design/tasks with final evidence and results.
- [ ] 10.7 Archive `fix-mobile-architecture-issues`.

## 11. Mobile Auth Stabilization (Single-Token Next Pass)

- [x] 11.1 Implement staged auth phases: `minting_api_token` and `syncing_profile`.
- [x] 11.2 Refactor boot path to prefer stored API JWT + protected probe before mint attempts.
- [x] 11.3 Ensure API token mint is single-flight and race-safe.
- [ ] 11.4 Add mobile integration tests for cold reopen valid/invalid token behavior.
- [ ] 11.5 Add mobile integration test for verify->mint->first protected call success.
- [ ] 11.6 Add stage-specific auth observability logs and normalized error codes.
- [ ] 11.7 Run physical iOS smoke: sign-in -> force-quit -> reopen -> sign-out.
