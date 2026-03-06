## Why

Authentication behavior is currently inconsistent across API and apps: email OTP request exists but verification UX is incomplete, passkey flows are partially wired, and provider assumptions remain Apple-centric in core paths. We need a single modern auth contract (email + OTP + passkey) with end-to-end coverage so sign-in is reliable and testable across Finance, Notes, and Rocco.

## What Changes

- Define a canonical auth contract for web apps using email OTP bootstrap and passkey-first return sign-in.
- Complete end-to-end email OTP flow: request code, verify code, establish session, and route users into authenticated app state.
- Complete passkey lifecycle flow: register (authenticated only), sign-in, and fallback to email OTP when passkey is unavailable.
- Remove legacy provider assumptions from session-subject mapping paths so non-OAuth auth methods are first-class.
- Implement a **layered auth verification architecture**: unit tests for auth logic, integration tests for screen/state-machine behavior, contract tests for backend correctness, and minimal E2E tests for critical native/browser paths.
- Standardize auth entry routes and callback behavior across Finance, Notes, and Rocco.

## Testing Architecture

### Layer 0: Unit Tests (Fastest feedback)
**Purpose:** Prove auth logic without UI or backend runtime cost
**Location:** `packages/auth/tests/` and app-local unit suites
**Coverage:**
- Email normalization and validation
- OTP input formatting and helpers
- Auth state transitions and reducers
- Passkey capability detection and guard logic
- Feature flags and environment gating

### Layer 1: API Contract Tests (Backend)
**Purpose:** Verify backend correctness for OTP and passkey flows
**Location:** `services/api/tests/auth.contract.test.ts`
**Coverage:**
- OTP issuance and verification
- Session creation and validation
- Passkey registration/verification challenges
- Expiry, replay, and failure cases
- Rate limiting and throttling

### Layer 2: Integration Tests (Primary safety net)
**Purpose:** Test auth flow as a state machine in JS while mocking only boundary dependencies
**Location:** `packages/auth/tests/` and `apps/*/tests/integration/`
**Coverage:**
- Email entry validation
- OTP entry and verification
- Resend code logic
- Invalid/expired code handling
- Passkey prompt shown/skipped
- Fallback from passkey to OTP
- Loading and error states
- Router redirects and signed-in/signed-out shell transitions

### Layer 3: E2E Tests (Critical Paths Only)
**Purpose:** Validate the full system on real browser/device surfaces where runtime and lifecycle matter
**Web (Playwright):** thin auth journey coverage across web apps
**Mobile (Expo iOS):** very small device-level suite only for native/lifecycle confidence

**Mobile Device Test Matrix:**
1. New user sign up with email + OTP
2. New user enrolls passkey after OTP verification
3. Returning user signs in with passkey
4. Returning user falls back to OTP when passkey unavailable
5. Session restore after terminate/relaunch or deep lifecycle transition

**Tooling guidance:**
- Use `jest-expo` for unit tests.
- Use React Native Testing Library for mobile screen/integration tests.
- Keep Playwright for web auth journeys.
- Keep mobile device E2E intentionally thin; use the runner that best matches the scenario.
- Prefer lifecycle/native-precision tooling for deep links, notifications, relaunch/session-restore, and system-mediated passkey flows; avoid one giant mobile auth suite.

**Why E2E stays small:**
- Most auth bugs live in state orchestration and backend contracts, not in device automation.
- System passkey UI is platform-owned, so app tests should focus on orchestration and fallback behavior.
- Fresh-state-per-test is mandatory for mobile device reliability.
- Smaller device suites are faster, less flaky, and easier to gate in CI.

## Status

### Completed (Section 1: Auth Test Foundation)
- ✅ 1.1 Deterministic OTP test retrieval contract (`/api/auth/test/otp/latest`)
- ✅ 1.2 Shared auth integration harness utilities (OTP retrieval, assertions, helpers)
- ✅ 1.3 Shared passkey integration harness (virtual WebAuthn authenticator)
- ✅ 1.4 Auth test environment docs and commands (test DB, Redis, env vars)
- ✅ **Web E2E tests**: All 6 tests passing with zero retries (OTP + passkey flows)
- ✅ **Email controls**: `SEND_EMAILS` flag prevents accidental emails in dev/test
- ✅ **Test data isolation**: Unique email format with timestamps

### Completed (Layered verification alignment)
- ✅ Proposal/design/tasks now reflect the layered 2026 testing model.
- ✅ Web auth E2E is thin and passing.
- ✅ Mobile auth now has unit, integration, rendered screen, API contract, and critical Detox OTP/session coverage in place.
- ✅ Deterministic mobile passkey-native device scenario is implemented and passing in the critical mobile suite.

### Completed Since Reactivation
- ✅ Modern mobile OTP UX implemented: six visual slots, single hidden input, paste normalization, Apple one-time-code hints
- ✅ Mobile rendered auth screen tests added with `jest-expo` + React Native Testing Library
- ✅ Mobile auth integration/state-machine coverage expanded for degraded state, fallback, refresh failure, and sign-out transitions
- ✅ Critical mobile Detox auth suite green: OTP success, invalid OTP rejection, session restore after cold start
- ✅ Deterministic mobile passkey device strategy implemented: guarded E2E-only passkey success/cancel bridge exercises real mobile auth state transition, token persistence, fallback behavior, and relaunch survival without relying on flaky simulator-owned system dialogs
- ✅ API auth proxy fixed to inject trusted origin for native mobile OTP requests without `Origin` header
- ✅ API auth contract coverage added for native-style OTP requests without origin
- ✅ API passkey contract coverage added for register success/unauthorized, auth success/malformed assertion, and method-agnostic auth resolution
- ✅ Shared web passkey client updated to match API registration payload contract
- ✅ Notes and Rocco browser auth suites added for OTP success and invalid-code rejection
- ✅ Finance browser fallback coverage added for passkey-to-OTP recovery
- ✅ Notes and Rocco browser fallback coverage added for passkey-to-OTP recovery
- ✅ Shared auth typing updated to remove stale Apple-only provider assumptions in active auth surfaces
- ✅ Shared server auth now forwards upstream auth cookies more consistently and app passkey callback routes validate redirect targets
- ✅ Unused legacy auth aliases removed from API without breaking active auth clients or CLI refresh flow
- ✅ Finance, Notes, and Rocco authenticated surfaces now verify passkey management/enrollment entry points in browser coverage
- ✅ GitHub workflows updated so auth layers run in CI (API auth contract, mobile auth lower layers, web auth E2E, mobile critical Detox)
- ✅ `auth_subjects(provider, provider_subject)` uniqueness is enforced at the schema level via generated Drizzle migration
- ✅ Full repo quality gates pass: `bun run build`, `bun run test`, and `bun run check`

### Final Verification Evidence
- `bun run build` passed
- `bun run test` passed
- `bun run check` passed
- Web auth coverage passed across Finance, Notes, and Rocco for OTP, passkey, and fallback journeys
- Mobile auth coverage passed across unit, integration, screen, and critical device-level flows including deterministic passkey success/cancel
- API auth contract suites passed, including email OTP, passkey register/auth, native mobile origin handling, and auth subject uniqueness enforcement

## Capabilities

### New Capabilities
- `auth-email-otp-passkey-contract`: Unified cross-app authentication capability covering email OTP bootstrap, passkey enrollment, passkey sign-in, and fallback behavior.
- `auth-integration-verification`: Layered verification (unit + integration + contract + minimal E2E) with shared test harness.

### Modified Capabilities
- `auth-system-cleanup`: Expand requirements from provider cleanup-only to enforce method-agnostic subject/session mapping and cross-app route consistency for modern auth methods.

## Impact

- **API**: `services/api/src/auth/*`, `services/api/src/routes/auth.ts`, middleware/session mapping behavior.
- **Shared auth package**: `packages/auth` client/server contracts and provider typing.
- **Apps**: auth routes and sign-in UX in `apps/finance`, `apps/notes`, and `apps/rocco`.
- **Tests**: auth unit tests, integration suites, API contract tests, and minimal browser/device E2E coverage; shared auth test scaffolding.
- **Ops/CI**: auth test environment setup and stable gates for auth flows.
