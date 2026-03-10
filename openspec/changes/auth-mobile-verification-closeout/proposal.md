## Why

The comprehensive auth mobile plan mixes completed history with remaining verification work. The unfinished portion should live as an OpenSpec change focused on final auth/mobile hardening and closeout.

## What Changes

- Capture the remaining mobile auth verification, operational hardening, and closeout work as an OpenSpec change.
- Preserve the outstanding mobile, security, and readiness gates from the legacy plan.
- Align mobile auth verification with a no-paid-Expo 2026 testing setup: `jest-expo` plus React Native Testing Library for unit and integration coverage, `expo-router/testing-library` for route-level auth validation, and Detox plus personal-device smoke coverage for native-critical checks.
- Rebuild the Expo / React Native mobile runtime settings around a deterministic variant model so `dev`, `e2e`, `preview`, and `production` generate the correct native project shape from first principles.
- Clear repo lint warnings that currently block a clean closeout signal from `bun run check`.
- Keep completed historical auth evolution out of the active planning surface.

## Capabilities

### New Capabilities

- `auth-mobile-operational-readiness`: Defines the remaining verification and operational readiness expectations for the auth platform on mobile.

### Modified Capabilities

None.

## Impact

- Affected code: mobile auth flows, Expo app config, native prebuild tooling, auth verification tooling, operational runbooks, final readiness checks, and repo packages with stale lint warnings surfaced during closeout.
- Affected systems: auth verification, Expo mobile test infrastructure, React Native native generation, mobile runtime confidence, and production readiness practices.
