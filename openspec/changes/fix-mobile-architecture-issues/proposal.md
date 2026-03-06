## Why

The mobile app architecture still has risk hotspots in auth flow orchestration, chat state synchronization, and failure handling. We already landed core refactors, but the remaining work is currently scoped with stale assumptions (feature-flag dual path, staged beta rollout, and backward-compat posture). The app is unreleased, so we should complete this change with a direct cutover approach that optimizes for correctness, performance, and maintainability.

## What Changes

### Core Architecture Completion

1. Finalize auth state machine behavior under concurrent and edge navigation conditions.
2. Complete chat state consolidation to a single source of truth and remove parallel/legacy paths.
3. Complete error-boundary behavior validation and graceful degradation guarantees.
4. Finalize storage/query behavior for offline-first reliability without duplicative state layers.

### Testing Philosophy Completion

5. Adopt integration-first RED→GREEN testing as the default:
   - tests cover full user flows and module contracts
   - assertions verify internal state invariants at critical checkpoints
   - focused unit tests remain only for pure reducers/parsers/helpers
6. Build shared mobile test scaffolding to remove duplication across auth/chat/offline integration suites.

### Performance and Reliability Completion

7. Measure and enforce startup/chat/list performance baselines.
8. Validate on simulator and physical devices with deterministic test setup.

### Cleanup and Cutover

9. Remove stale/legacy mobile paths and superseded abstractions in the same change.
10. Remove rollout tasks that assume dual-path feature flags for unreleased mobile architecture.
11. Remove OAuth-based auth entrypoints and keep only email+OTP and passkey authentication flows.

## Capabilities

### New Capabilities

- `mobile-auth-state-machine`: Deterministic auth state transitions and routing guard behavior.
- `mobile-error-boundaries`: Scoped crash containment with recoverable feature failure states.
- `mobile-state-consolidation`: Single-state-source architecture for chat and related mobile data flows.

### Modified Capabilities

None. This change is architecture and test rigor modernization without new end-user features.

## Impact

### Affected Files (Primary)

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/(drawer)/_layout.tsx`
- `apps/mobile/utils/auth/*`
- `apps/mobile/utils/query-client.ts`
- `apps/mobile/utils/local-store/*`
- `apps/mobile/utils/services/chat/*`
- `apps/mobile/components/error-boundary/*`
- `apps/mobile/tests/**/*`

### Backward Compatibility

Not required for this mobile architecture change because the app is unreleased. We prefer direct replacement over adapters/shims.

### Platform Scope

This mobile application is iOS-only. Android support is explicitly out of scope.

### Dependencies

No new architecture dependency is required by default. Existing Expo, React Query, and Zod stack remains the baseline.

### Testing Strategy

- Integration-first suites for auth, chat, offline transitions, and navigation/deeplink behavior.
- Contract-driven E2E for user-critical flows (sign-in/sign-out, guarded navigation, chat send/stream/persist).
- Targeted unit tests only for deterministic pure logic.

### Migration

No data migration requirement is expected. Any remaining legacy code paths are removed in-place during completion.

## Validation Snapshot (2026-03-06)

- `bun run --filter @hominem/mobile test` passed (unit + integration suites).
- `bun run test:e2e:auth:mobile` passed once local API infra was started.
- `bun run typecheck` passed.
- `bun run lint --parallel` passed (workspace warnings present outside this change, no lint errors).
- `bun run check` passed.
- Performance evidence captured in `performance-validation.md` for startup and auth flow timing.
- Focus traversal benchmark evidence captured in `performance-validation.md`.
- `bun run test:e2e:auth:live:local` passed with email+OTP/passkey surface checks only (OAuth probes removed).
- Physical iOS validation issue log maintained in `ios-physical-validation.md`.

## Auth Scope Lock

- OAuth sign-in/linking paths are removed from the active auth surface.
- Supported auth methods are email+OTP and passkey.

## Active Stabilization Plan

- Mobile auth token contract and cold-reopen stabilization details are tracked in:
  - `openspec/changes/fix-mobile-architecture-issues/mobile-auth-next-pass.md`
