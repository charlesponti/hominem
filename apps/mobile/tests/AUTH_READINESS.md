# Mobile Auth Operational Readiness

Last reviewed: March 10, 2026

This document is the closeout surface for mobile auth verification, deterministic test coverage, operational controls, and production-readiness sign-off.

## Verification Matrix

| Gate | Command | Result | Notes |
| --- | --- | --- | --- |
| Mobile auth unit suite | `bun run --filter @hominem/mobile test:unit:auth` | Passed | 51 assertions passed on March 10, 2026 |
| Mobile auth integration suite | `bun run --filter @hominem/mobile test:integration:auth` | Passed | 14 assertions passed on March 10, 2026 |
| Mobile auth screen suite | `bun run --filter @hominem/mobile test:screens:auth` | Passed | 10 assertions passed on March 10, 2026 after removing async `act(...)` warnings |
| Mobile auth router suite | `bun run --filter @hominem/mobile test:routes:auth` | Passed | 2 Expo Router auth route checks passed on March 10, 2026 after fixing the SafeAreaProvider Jest mock for the router harness |
| API auth contract and guard suite | `bun run --filter @hominem/api test:auth` | Passed | 17 assertions passed on March 10, 2026 |
| Passkey step-up security suite | `bun run --filter @hominem/api test -- src/routes/auth.step-up.test.ts` | Passed | 3 assertions passed on March 10, 2026 covering step-up enforcement for passkey register/delete flows |
| Live auth edge smoke | `bun run test:e2e:auth:live` | Passed | Confirmed `/.well-known/jwks.json`, `/api/status`, `/api/auth/session`, and `/api/auth/email-otp/send` from `https://api.ponti.io` on March 10, 2026 |
| Detox auth critical suite | `bun run --filter @hominem/mobile test:e2e:auth:critical` | Passed | 5 native-critical auth flows passed on March 10, 2026 after removing the flaky cleanup path |
| Detox smoke suite | `bun run --filter @hominem/mobile test:e2e:smoke` | Passed | Clean-install signed-out smoke passed on March 10, 2026 after making synchronization teardown tolerant of app shutdown |
| Personal-device smoke | See checklist in [apps/mobile/README.md](/Users/charlesponti/Developer/hominem/apps/mobile/README.md) | Accepted risk for closeout | Passkey UI is feature-flagged off by default, so remaining real-device passkey validation is explicitly de-scoped from this release closeout |

## Deterministic Workflow Status

- `jest-expo` plus React Native Testing Library remain the primary JS-side auth gate.
- Expo Router auth routing now has a dedicated `expo-router/testing-library` suite.
- Detox is the repo-standard native-critical auth harness for simulator verification.
- Expo / React Native native generation now follows a single variant source of truth:
  - `dev` generates a Metro-backed dev-client app
  - `e2e` generates a standalone Detox app with dev-client modules excluded
  - variant-aware prebuild commands regenerate `ios/` when switching between those shapes
- Mobile passkey UI is now feature-flagged behind `EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED` and should remain off outside targeted validation sessions.
- Passkey device coverage remains deterministic in the e2e app variant through explicit controls:
  - `auth-e2e-passkey-success`
  - `auth-e2e-passkey-cancel`
- A personal-device passkey smoke run is no longer a release-blocking gate while the mobile passkey UI remains feature-flagged off by default.

## Coverage Split

- Detox covers: OTP sign-in, invalid OTP handling, session restore after relaunch, and simulator auth smoke.
- Personal-device verification covers: future real hardware passkey/platform validation before the passkey flag is enabled.

## Personal Device Workflow

Use the manual smoke in [apps/mobile/README.md](/Users/charlesponti/Developer/hominem/apps/mobile/README.md):

1. Complete email + OTP sign-in.
2. Verify protected API-backed data loads.
3. Sign out and confirm the app returns to signed-out state.
4. Relaunch and confirm refresh-token session restore.

## Operational Controls

### Emergency controls already implemented

- Mobile E2E login is denied unless `AUTH_E2E_ENABLED=true` and the API is not running in production.
- Test OTP retrieval returns `404` when the non-production test store is disabled.
- Test OTP retrieval returns `403` when `x-e2e-auth-secret` does not match `AUTH_E2E_SECRET`.
- Mobile passkey-sensitive actions require recent passkey step-up proof for existing users:
  - passkey registration
  - passkey deletion
- Session revocation is available through `POST /api/auth/logout`.
- Mobile auth can fall back to email OTP when passkey flow is unavailable or cancelled.

### Incident-response runbook

1. If a non-production mobile auth harness is misbehaving, set `AUTH_E2E_ENABLED=false` to disable `/api/auth/mobile/e2e/login`.
2. Rotate `AUTH_E2E_SECRET` if OTP lookup or deterministic mobile login credentials are suspected to be exposed.
3. Validate that `/api/auth/test/otp/latest` is still unreachable in production.
4. If passkey-management behavior regresses, rely on OTP sign-in while investigating and confirm step-up enforcement still blocks passkey register/delete for existing users.
5. Revoke affected sessions through the logout/session controls before reopening a degraded auth surface.

## Remaining Items

| Item | Status | Resolution |
| --- | --- | --- |
| Mobile auth router suite | Closed | Passed on March 10, 2026 after fixing the SafeAreaProvider Jest mock for the router harness |
| Detox auth critical suite | Closed | Passed on March 10, 2026 after removing the flaky cleanup path |
| Detox smoke suite | Closed | Passed on March 10, 2026 after making synchronization teardown tolerant of app shutdown |
| Expo / React Native variant architecture | Closed | Rebuilt on March 10, 2026 so `dev` and `e2e` generate deterministic native projects with the correct dev-client and updates behavior |
| Personal-device smoke confirmation | De-scoped from closeout | Mobile passkey UI is feature-flagged off, so real-device passkey validation moves to the future flag-enable work instead of blocking auth-mobile closeout |

## Readiness Decision

Current status: signed off for closeout on March 10, 2026.

Sign-off basis:

1. all repo and mobile auth verification gates passed
2. Finance auth app E2E is stable and green
3. remaining mobile passkey device validation is explicitly de-scoped because the passkey UI remains feature-flagged off by default
