## Purpose

Replace the previous implementation draft with a completion plan that moves mobile architecture toward two explicit targets:

- iOS-native UI composition using Apple design primitives and motion conventions.
- Expo best-practice project structure for deterministic startup, stable route typing, and predictable evolution.

This design preserves existing migration constraints: no backward compatibility adapter layer, no feature-flag beta rollout, and no data migration work in this change.

## Core Constraints (Non-Negotiable)

- App remains iOS-only; Android remains out of scope for this active change.
- Auth surface is email+OTP and passkey only; OAuth sign-in/linking routes are out of scope and removed.
- No user-visible feature expansion; we only stabilize existing product flows.
- Direct cutover only: no dual-path runtime, no legacy architecture shims.
- Unreleased app semantics stay intact: backward compatibility adapters are not required.
- Contract-driven testing and measurable quality gates remain mandatory for auth, chat, and navigation.
- Type safety remains strict (`no any`, no unsafe casts).

## Design Goal

Create a single, modernized mobile architecture that is easier to maintain and test without changing external behavior:

1. Deterministic auth resolution and route guarding with zero-loop navigation.
2. Single-source-of-truth chat/state flows across online and offline transitions.
3. Predictable failure containment with scoped error boundaries.
4. Intentional design system foundation using reusable Apple-style primitives.
5. Stable Expo folder and provider structure aligned with official routing and config patterns.

## Apple Design Primitive Layer (UI)

### Guiding principles

- Use semantic, HIG-aligned tokens before component-level styling.
- Prefer composition: primitives define behavior and spacing; screens compose them.
- Keep motion minimal, meaningful, and consistent with system conventions.

### Required primitives

- Layout tokens: baseline spacing scale, safe-area-aware rhythm, inset and corner tokens.
- Typography tokens: platform defaults (`SF Pro Text`, fallback chain), semantic roles.
- Surface tokens: elevated card, grouped list row, divider, and separator styles.
- Iconography: `expo-symbols` for status/action/iconography in priority paths.
- Controls: `apple-style` primary/secondary actions with disabled, loading, and danger variants.
- Motion patterns: enter/leave staging for route-level screens, optimistic send transitions, and focused error recovery.

### Scope of UI migration

- Existing screens are migrated to primitives in bounded slices by domain:
  - auth and onboarding
  - focus list and focus detail screens
  - chat compose/thread/stream surfaces
  - account screens
- Migration can proceed screen-by-screen, but each migrated slice must use only tokens from the new primitive layer.

## Expo Best-Practice Architecture

### Structural direction

Treat `app/` as routing and presentation entry points only; push reusable logic into a disciplined source tree:

- `app/` remains route ownership for navigation and shell composition.
- `src/` (or equivalent new source root under `apps/mobile`) hosts providers, services, tests helpers, and feature logic.
- `components/` contains Apple primitives + reusable composition modules.
- `state/` contains auth/chat/store contracts and transition contracts.
- `providers/` centralizes `QueryClient`, API context, auth session context, and error-boundary wiring.
- `services/` owns integration points for RPC, local storage fallbacks, and offline adapters.
- `utils/` is reduced to adapter utilities that do not own architecture control.

### Provider graph policy

- Single global provider tree in root layout:
  - theme + insets + query + session + error boundary.
- Feature boundaries use hooks into that graph only; no ad-hoc provider instances in leaf screens.
- Feature entry points must be testable with the shared integration harness.

### Route and navigation policy

- Preserve protected/public route groups where behavior is already established.
- Keep route guards deterministic:
  - one auth decision per boot cycle
  - no repeated re-evaluation loops on redirects
  - deeplink handling under unresolved auth state has explicit outcomes

## Decisions

### D1: Rearchitecture Order

- Complete integration contracts first, then apply architecture refactors behind those contracts (RED→GREEN).
- This avoids visual churn and reduces risk while still allowing full UI rewrite sequencing.

### D2: Apple Primitives Are Canonical, Not Optional

- All newly touched screens and shared components must use the new primitive layer.
- Existing screens may adopt in the same change where touched by migration tasks.

### D3: Expo Structure Is the Default for New Modules

- New modules must follow the new `app` + `src` boundary.
- New features should avoid adding deep coupling inside `app/` route files.

### D4: Persistence Strategy Remains Explicitly Centralized

- Keep the current explicit persistence decision for this phase (as previously documented).
- No additional persisted caches are introduced until a future architecture change defines durability goals.

### D5: Performance Is a Design Requirement

- Baselines must be captured again after full primitive migration.
- Threshold breaches are blockers for merge, not refactor comments.

## Migration Constraints to Preserve

- No data migration path is required; this change is app-architecture and UI foundation only.
- No migration shim required for auth/chat behavior; direct replacement is expected.
- Existing external integration contracts (RPC + navigation contracts already under test) remain unchanged.
- Rollback criteria stays limited to release gating (test suite + perf + typed checks), not runtime compatibility scaffolding.

## Risks and Mitigations

- `auth loop` risk: strict guard contract tests plus boot de-duplication in provider layer.
- `chat rendering drift`: contract tests for stream ordering and optimistic transitions prevent silent visual/state divergence.
- `primitive migration churn`: slice-by-slice rollout with feature-level exit criteria.
- `expo-structure drift`: lint checks plus file-structure checklist in CI review.

## Execution Plan

### Phase A: Design-System Foundations

1. Freeze the Apple primitive API (tokens, primitives, motion primitives, icon policy).
2. Add/complete migration notes for screen-by-screen adoption checkpoints.
3. Update integration harness to cover UI-layer test fixtures for updated primitives.

### Phase B: Architecture Replatforming

1. Normalize provider graph in root layout and remove parallel provider paths.
2. Move shared non-route logic behind clear service/state boundaries.
3. Finalize auth and guard contracts for route transitions and deeplink behavior.

### Phase C: Domain Migration

1. Migrate auth and chat interaction screens to primitive components.
2. Migrate focus and account surfaces to the same tokenized patterns.
3. Keep behavior contracts green at each domain slice.

### Phase D: Consolidation and Gates

1. Remove stale legacy architecture references in touched domains.
2. Re-run full integration/e2e/performance gates with documented thresholds.
3. Archive final evidence and confirm migration constraints were preserved.

## Acceptance Gates

- Integration auth contract suite passes.
- Chat offline + stream + optimistic flow suite passes.
- Error boundary contract suite passes under recovery scenarios.
- Typecheck + lint + full mobile test suites pass from repo root commands.
- Startup/chat/scroll baselines are captured and remain within acceptance thresholds.
- No legacy dual-path or back-compat wrappers remain in the scope of this change.
