## Context

The legacy auth plan mostly documents already-completed architecture work. What remains active is the final verification and operational closeout for mobile auth readiness.

## Goals / Non-Goals

**Goals:**
- Preserve the remaining auth/mobile verification work in OpenSpec.
- Separate unfinished hardening tasks from historical auth narrative.
- Keep the focus on final readiness gates rather than re-documenting the completed rewrite.
- Align the remaining readiness work with the 2026 Expo testing model so verification paths are explicit and maintainable.
- Rebuild the Expo / React Native configuration around a deterministic variant architecture so native generation matches the intended runtime without manual cleanup.
- Eliminate repo lint warnings surfaced by the closeout safety check so `bun run check` reflects only active regressions.

**Non-Goals:**
- Re-planning the entire auth architecture.
- Recreating historical migration records as active work.

## Decisions

### Focus the migrated change on remaining work only

The old plan contains a large amount of completed context. The OpenSpec change should only carry forward the unfinished readiness items.

### Represent closeout as one readiness capability

The remaining work is cohesive: verification, operational readiness, and sign-off. A single readiness capability keeps the migration understandable.

### Use a layered local-first testing strategy

The closeout should treat testing as a layered system instead of a single mobile gate. `jest-expo` with React Native Testing Library covers unit and integration behavior, `expo-router/testing-library` covers route-level auth behavior, Detox covers native-critical simulator behavior, and personal-device smoke covers the remaining hardware-specific confidence without depending on paid Expo workflow features.

The adjacent web auth E2E coverage should also stay deterministic inside local and CI constraints. OTP retrieval should poll until the test harness publishes the code, and passkey browser tests should only execute when the browser origin is a secure WebAuthn-capable context. When that capability is unavailable, the suite should skip the passkey registration assertion instead of failing the entire auth closeout gate.

Finance auth E2E should run with a single Playwright worker and a larger per-test timeout so cold-start SSR compilation, OTP bootstrap, and auth cookie setup do not race each other during closeout verification.

When Finance browser tests only need an authenticated `email_otp` session after the UI reaches `/auth/verify`, they can use the dedicated test-only auth bootstrap endpoint instead of depending on the OTP verify widget for every case. The invalid-code UI path remains covered separately, while the authenticated-path tests stay deterministic.

### Use one source of truth for runtime variants

`APP_VARIANT` should determine app identity, native module inclusion, local environment loading, update behavior, and testing expectations. The `dev` variant should be the only variant that includes `expo-dev-client` and connects to Metro. `e2e` should generate a standalone test binary without the dev launcher so Detox runs against the same native shape every time. `preview` and `production` should remain standalone update-enabled variants.

### Decouple passkey trust from local API hostnames

Passkeys cannot rely on `localhost` or a LAN IP as the effective relying-party domain on a physical iPhone. Mobile auth should use an explicit stable HTTPS passkey domain for `webcredentials`, Apple app-site association, and Better Auth passkey RP settings. Local API development can remain local, but passkey trust must point at a real domain.

### Make native generation deterministic when switching variants

The repo should not rely on a previously generated `ios/` tree being compatible with a different variant. Variant-aware prebuild commands should regenerate native artifacts when the requested runtime shape changes so the Podfile, Expo plist, app identity, and project naming stay aligned.

### Treat stale lint warnings as closeout debt

The closeout gate uses `bun run check`, so warning-only lint debt in adjacent packages still obscures whether auth mobile work is actually clean. Removing truly dead local helpers and stale imports keeps the closeout signal trustworthy without inventing a separate cleanup project.

## Risks / Trade-offs

- Some “remaining” items may already be complete -> Mitigation: validate the task list before implementation.
- Operational tasks may span code and docs -> Mitigation: keep verification and runbook work explicit in tasks.
- Detox coverage may remain flaky for simulator workflows -> Mitigation: keep Detox scoped to native-critical auth flows and require a final personal-device smoke pass for hardware-specific confidence.
- Native prebuild output can drift across variants -> Mitigation: keep variant definitions centralized and make prebuild commands enforce the expected native project shape.

## Migration Plan

1. Capture the unfinished auth/mobile readiness work in OpenSpec, including the updated local-first testing strategy and deterministic variant architecture.
2. Remove the legacy docs/plans version.
3. Continue implementation only from the OpenSpec change.

## Open Questions

- Which passkey and hardware-specific auth scenarios still require manual device verification after the Detox suite passes?
