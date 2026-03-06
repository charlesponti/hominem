## Context

Current auth behavior is fragmented across three web apps and shared services. API supports Better Auth email OTP and passkey plugins, but app UX only covers OTP send in several places and does not consistently complete OTP verification. Session-to-user mapping paths still assume OAuth provider semantics in places where email OTP or passkey sessions are expected. Test coverage is uneven: there is strong route-level auth coverage in API for select flows, but no complete cross-app auth journey verification for email OTP + passkey.

This change is cross-cutting across `services/api`, `packages/auth`, and `apps/{finance,notes,rocco}` with security-sensitive behavior and test-environment dependencies (test DB, Redis, deterministic OTP retrieval).

## Goals / Non-Goals

**Goals:**
- Define one method-agnostic auth contract for web apps: email OTP bootstrap, passkey enrollment, passkey sign-in, and OTP fallback.
- Remove provider-specific assumptions from generic session-subject mapping paths.
- Standardize auth entry/callback routing semantics across Finance, Notes, and Rocco.
- Adopt integration-first RED→GREEN verification with shared test scaffolding and zero duplicate auth test plumbing.
- Ensure auth behavior is proven end-to-end in CI with deterministic and repeatable outcomes.

**Non-Goals:**
- Reintroducing Apple or adding new OAuth providers in this change.
- Building a password-based auth path.
- Mobile auth redesign (mobile e2e bootstrap remains separate).
- Introducing shim or dual-path legacy adapters; this change enforces direct cutover behavior.

## Decisions

### Decision 1: Canonical Auth Journey Contract (Email OTP + Passkey)
Adopt a single journey:
1. User submits email to request OTP
2. User verifies OTP to establish session
3. Authenticated user can register passkey
4. Returning users can sign in by passkey, with OTP fallback

Rationale: aligns with current product goal, preserves recovery path, and removes OAuth/provider dependence for primary auth.

Alternatives considered:
- OAuth-first flow with optional passkey: rejected due to continued provider coupling and inconsistent local behavior.
- Passkey-only flow: rejected due to weaker account recovery and support burden.

### Decision 2: Method-Agnostic Subject/Session Mapping
Generic session resolution MUST not hardcode provider identity assumptions. Mapping logic will treat email OTP and passkey sessions as first-class and only use provider labels where a provider-auth flow is explicitly involved.

Rationale: prevents semantic drift, incorrect linkage records, and future auth-method regression.

Alternatives considered:
- Keep Apple as fallback provider label: rejected as implicit shim.
- Split separate mapping stacks per method: rejected due to duplicated risk surface.

### Decision 3: Integration-First Test Strategy
Use integration suites as source of truth, with unit-level assertions embedded in journey-level tests where practical.
- API contract integration tests validate endpoint behavior and session semantics.
- Browser integration tests validate complete app journeys and route behavior.
- Shared auth test harness provides deterministic OTP retrieval, passkey emulator setup, and auth assertions.

Rationale: maximizes confidence for security-critical flows while avoiding duplicated, brittle isolated tests.

Alternatives considered:
- Unit-first with minimal integration: rejected because auth failures often emerge at boundaries.
- Browser-only e2e: rejected due to lower diagnostic precision and slower iteration.

### Decision 4: No-Shim Cutover Rule
Legacy auth modules/patterns in scope are replaced directly rather than wrapped/adapted. No alias exports, dual-path logic, or compatibility wrappers for auth journey behavior in this change.

Rationale: avoids carrying forward legacy complexity and keeps architecture coherent for upcoming module refactors.

Alternatives considered:
- Temporary compatibility layer: rejected due to long-tail maintenance and hidden behavior divergence.

### Decision 5: Shared Cross-App Route Semantics
All three web apps will align on explicit auth route surface and callback normalization behavior, with consistent post-auth redirect guarantees and consistent unauthenticated route guards.

Rationale: prevents app-specific auth drift and reduces support/debug overhead.

Alternatives considered:
- Per-app custom route semantics: rejected due to regression risk and duplicated auth logic.

## Risks / Trade-offs

- [Risk] OTP test determinism depends on email delivery path implementation.
  Mitigation: introduce deterministic test OTP retrieval contract and isolate it to test/runtime guardrails.

- [Risk] Browser passkey emulation can be flaky across environments.
  Mitigation: standardize on Chromium + virtual authenticator helpers and keep passkey tests in a stable dedicated suite.

- [Risk] Direct cutover can surface latent route/typing regressions in app auth code.
  Mitigation: enforce API and browser RED suites before GREEN implementation and keep route behavior assertions explicit.

- [Risk] Cross-app standardization increases short-term change volume.
  Mitigation: execute in strict phased order with shared harness first, then app-by-app flow completion.

## Migration Plan

1. Finalize capability specs for contract and verification behavior.
2. Build shared auth integration harness (OTP retrieval, passkey emulator setup, session assertions).
3. Add API RED contract suites for OTP and passkey journeys.
4. Add browser RED integration suites for Finance, Notes, Rocco.
5. Implement GREEN cutover in API/session mapping and app auth routes/UX.
6. Remove in-scope legacy auth path remnants with no shims.
7. Run final gates: auth-focused test suites, broader test/check/typecheck as required.

Rollback strategy:
- Revert the change branch as a unit; do not preserve partial dual-path behavior.
- Because no schema migration is required for this auth contract change, rollback is code-level and immediate.

## Open Questions

- Should OTP retry limits and lockout copy be fully unified in UI text across all apps in this change, or only behavior-level alignment now?
- Should passkey enrollment be prompted immediately after first OTP sign-in for every app, or gated by app-specific UX timing?
- Should auth route naming be fully identical across apps (`/auth/signin` vs `/auth/email`) in this change, or standardized via redirect aliases with strict deprecation window?
