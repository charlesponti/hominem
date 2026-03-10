## Context

Current auth behavior is fragmented across three web apps and shared services. API supports Better Auth email OTP and passkey plugins, but app UX only covers OTP send in several places and does not consistently complete OTP verification. Session-to-user mapping paths still assume OAuth provider semantics in places where email OTP or passkey sessions are expected. Test coverage is uneven: there is route-level auth coverage in API for select flows, but the overall auth test pyramid is too shallow in unit/integration layers and too ambiguous about which flows truly need device-level automation.

This change is cross-cutting across `services/api`, `packages/auth`, and `apps/{finance,notes,rocco}` with security-sensitive behavior and test-environment dependencies (test DB, Redis, deterministic OTP retrieval).

## Goals / Non-Goals

**Goals:**
- Define one method-agnostic auth contract for web apps: email OTP bootstrap, passkey enrollment, passkey sign-in, and OTP fallback.
- Remove provider-specific assumptions from generic session-subject mapping paths.
- Standardize auth entry/callback routing semantics across Finance, Notes, and Rocco.
- Adopt a layered RED→GREEN verification model where unit/integration tests provide the bulk of signal, contract tests prove backend correctness, and E2E is reserved for critical runtime-native paths.
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

### Decision 3: Layered Verification Strategy
Use a modern auth test pyramid instead of broad end-to-end suites.
- Unit tests cover pure auth logic, validation, reducers/state transitions, and capability guards.
- Integration tests cover screen behavior and auth state-machine transitions with mocked boundaries.
- API contract tests validate endpoint behavior, token/session semantics, passkey challenge correctness, and failure/expiry rules.
- E2E tests stay narrow and prove only the critical browser/device flows where full-system runtime confidence is required.

Rationale: maximizes signal per minute, keeps failures diagnosable, and matches current React Native/Expo guidance to rely primarily on Jest + React Native Testing Library rather than pushing all auth confidence into device tests.

Alternatives considered:
- Device-first auth coverage: rejected because it is slower, more brittle, and obscures root cause.
- Unit-only coverage with minimal integration: rejected because auth bugs often emerge at screen, routing, and backend boundaries.

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

### Decision 6: Mobile Device Tests Stay Minimal And Scenario-Driven
Mobile device E2E for Expo apps MUST remain thin and focused on cases where native/runtime precision matters: passkey happy path, fallback from system-mediated auth, session restore after relaunch, and deep lifecycle entry points such as deep links or notifications.

Runner choice is scenario-driven rather than ideological:
- simpler smoke and happy-path mobile coverage can use lighter black-box tooling when adopted,
- lifecycle-sensitive and gray-box runtime cases can use deeper mobile tooling.

This change does not require a mobile runner migration; it requires that the test architecture not depend on one broad, state-sharing mobile suite.

Rationale: keeps the change aligned with current Expo ecosystem guidance while preserving the option to use deeper native tooling for the small set of flows that actually need it.

Alternatives considered:
- Standardize on one mobile E2E runner for every auth case: rejected because different layers and scenarios need different levels of runtime control.

## Risks / Trade-offs

- [Risk] OTP test determinism depends on email delivery path implementation.
  Mitigation: introduce deterministic test OTP retrieval contract and isolate it to test/runtime guardrails.

- [Risk] Browser passkey emulation can be flaky across environments.
  Mitigation: standardize on Chromium + virtual authenticator helpers and keep passkey tests in a stable dedicated suite.

- [Risk] Mobile device suites become broad and flaky if used as the primary auth safety net.
  Mitigation: keep mobile E2E minimal, require fresh state per test, and move most auth behavior checks into unit/integration/contract layers.

- [Risk] Direct cutover can surface latent route/typing regressions in app auth code.
  Mitigation: enforce API and browser RED suites before GREEN implementation and keep route behavior assertions explicit.

- [Risk] Cross-app standardization increases short-term change volume.
  Mitigation: execute in strict phased order with shared harness first, then app-by-app flow completion.

## Migration Plan

1. Finalize capability specs for contract and verification behavior.
2. Build shared auth integration harness (OTP retrieval, passkey emulator setup, session assertions).
3. Add unit and integration RED suites for auth state-machine behavior.
4. Add API RED contract suites for OTP and passkey journeys.
5. Add thin browser and mobile device E2E suites only for critical runtime/native flows.
6. Implement GREEN cutover in API/session mapping and app auth routes/UX.
7. Remove in-scope legacy auth path remnants with no shims.
8. Run final gates: auth-focused test suites, broader test/check/typecheck as required.

Rollback strategy:
- Revert the change branch as a unit; do not preserve partial dual-path behavior.
- This change now includes a schema migration enforcing `auth_subjects(provider, provider_subject)` uniqueness. Rollback requires reverting both code and that migration in a coordinated database-safe way.

## Open Questions

- Should OTP retry limits and lockout copy be fully unified in UI text across all apps in this change, or only behavior-level alignment now?
- Should passkey enrollment be prompted immediately after first OTP sign-in for every app, or gated by app-specific UX timing?
- Should auth route naming be fully identical across apps (`/auth/signin` vs `/auth/email`) in this change, or standardized via redirect aliases with strict deprecation window?
