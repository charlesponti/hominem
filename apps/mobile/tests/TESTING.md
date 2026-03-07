# Mobile Auth Testing Matrix

This app uses a layered testing model for auth.

## Principles

- Put most confidence in unit, integration, and contract tests.
- Keep device E2E small and focused on native/lifecycle-critical behavior.
- Start every device test from fresh app state.
- Do not build one giant shared-state auth suite.

## Layers

### 1. Unit

Use for pure logic, helpers, and state transitions.

Current files:
- `apps/mobile/tests/auth-state-machine.test.ts`
- `apps/mobile/tests/auth-provider-utils.test.ts`
- `apps/mobile/tests/auth-route-guard.test.ts`
- `apps/mobile/tests/auth-validation.test.ts`
- `apps/mobile/tests/startup-metrics.test.ts`
- `apps/mobile/utils/auth-provider.test.ts`
- `apps/mobile/lib/auth-client.test.ts`

Best cases for this layer:
- email normalization and validation
- OTP input formatting
- auth state machine transitions
- route guard decisions
- passkey capability guards
- callback URL parsing and auth result mapping

Run with:

```bash
bun run test:unit:auth
```

### 2. Integration

Use for screen/state-machine behavior in JS with mocked boundaries.

Current files:
- `apps/mobile/tests/integration/auth-contract.integration.test.ts`

Best cases for this layer:
- email entry and request-code flow state
- OTP verify screen behavior
- resend code and retry UX
- invalid/expired code handling
- signed-in/signed-out shell transitions
- redirect behavior
- passkey CTA shown/skipped
- fallback from passkey UI to OTP UI

Run with:

```bash
bun run test:integration:auth
```

### 3. Contract

Use for backend/auth boundary correctness.

Primary ownership lives in API/shared auth packages, but mobile relies on these contracts:
- request OTP
- verify OTP
- invalid OTP semantics
- expired OTP semantics
- session bootstrap/refresh/sign-out
- passkey registration challenge
- passkey assertion challenge
- fallback semantics

These should fail before device tests fail.

### 4. Device E2E

Use only for high-value native confidence.

Current files:
- `apps/mobile/e2e/smoke.mobile.e2e.js`
- `apps/mobile/e2e/auth.mobile.e2e.js`

Critical auth device tests:
- OTP sign-in success
- invalid OTP remains unauthenticated
- session restore after terminate/relaunch

Next device test to add:
- one deterministic passkey-native-critical path, but only after the simulator/runtime strategy is explicit

### Passkey Device Gap

Do not add a passkey device test by guessing at system UI behavior.

Before adding it, define:
- simulator/device prerequisites for iOS passkeys
- whether the scenario is sign-in fallback or full passkey happy path
- how credential state is seeded or enrolled deterministically
- which system dialogs are expected and how they are synchronized

Until then, passkey confidence should come from:
- unit coverage for capability guards
- integration coverage for CTA visibility and fallback orchestration
- API contract coverage for passkey challenge/verification semantics

Run with:

```bash
bun run test:e2e:auth:critical
```

## Runner Selection

Use the lightest runner that still proves the behavior.

- `vitest` / `jest-expo` style unit tests: pure logic and hooks
- React Native integration tests: app state and screen behavior
- API contract tests: backend correctness
- Detox: native/lifecycle-sensitive mobile flows only

If the team later adopts a lighter black-box mobile runner for simple smoke flows, keep deep lifecycle and native-precision scenarios in Detox or equivalent gray-box tooling.

## Fresh-State Rule For Detox

Device auth tests must start from fresh app state:

```js
beforeEach(async () => {
  await device.clearKeychain()
  await device.launchApp({ newInstance: true })
  await device.disableSynchronization()
  await resetToSignedOut()
})
```

Notes:
- prefer fresh launch over one shared `beforeAll` auth session
- avoid `reloadReactNative()` as a default reset strategy
- keep each spec independent

## CI Shape

### PR Gate

- `bun run test:unit:auth`
- `bun run test:integration:auth`
- auth contract tests in API/shared packages
- `bun run test:e2e:auth:critical`

### Nightly / Release

- full mobile smoke/device suite
- passkey-native device scenario
- relaunch/session-restore checks
- deep link / notification lifecycle flows
- artifacts on failure

## Anti-Flake Rules

- no giant end-to-end auth chain
- no shared app state across specs
- no arbitrary sleeps when a state/assertion wait exists
- prefer stable accessibility/test IDs for critical controls
- never depend on real email delivery in CI
- always use deterministic OTP retrieval in test

## Recommended Next 10 Tests

1. unit: passkey capability detection
2. unit: OTP resend cooldown logic
3. unit: auth callback parsing edge cases
4. integration: email entry validation states
5. integration: OTP verify loading/error transitions
6. integration: resend code success + throttled state
7. integration: passkey CTA visibility after verified session
8. integration: passkey fallback to OTP UI
9. contract: passkey register success/failure semantics
10. device E2E: passkey native-critical path
