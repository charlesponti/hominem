## Context

The consolidated auth/mobile plan dated 2026-03-09 reports core platform migration complete but leaves closeout work open in several areas. After reviewing the current repo state, the most meaningful unfinished work is engineering-facing: mobile refresh determinism, redirect/callback safety across the web apps, replay and step-up enforcement, and verification against the currently active test lanes.

The current implementation uses Better Auth as the underlying mobile/web auth substrate. Mobile passkey sign-in is driven by the Better Auth Expo client and token exchange, not a custom PKCE callback flow. Web auth routes across Finance, Notes, and Rocco share the same general shape but still rely on minimal redirect validation and partially duplicated callback behavior. The closeout therefore needs to target the real remaining issues: refresh-token race safety, validated mobile bootstrap handling, redirect allowlist enforcement, OTP replay handling, passkey step-up enforcement, and verification coverage tied to the test infrastructure that actually exists today.

## Goals / Non-Goals

**Goals:**
- Convert remaining in-progress auth/mobile implementation gaps into explicit, testable requirements.
- Require deterministic mobile auth lifecycle behavior for bootstrap handling and refresh scheduling.
- Require redirect-safe and callback-consistent auth behavior across Finance, Notes, and Rocco.
- Require final cross-surface verification gates using API contract tests, web auth integration tests, mobile Detox auth flows, and live status/auth checks.

**Non-Goals:**
- Rebuild or replace Better Auth foundations already marked complete.
- Add new auth factors beyond Apple, OTP, and passkey.
- Redesign existing auth table model or migration strategy.
- Produce the broader operational sign-off package, readiness matrix, or incident/runbook artifacts that are better tracked outside this engineering change.

## Decisions

1. Keep the change, but narrow it to engineering-hardening work
- Decision: Retain `auth-runtime-hardening-and-verification` as the home for the remaining code and verification work, but remove the operations-heavy closeout scope.
- Rationale: There are still meaningful implementation gaps, but the current scope is too broad to close cleanly.
- Alternative considered: Archive the change as stale. Rejected because multiple unfinished requirements still map to real code paths.

2. Express completion through spec-level requirements, not checklist-only docs
- Decision: Encode remaining gates in OpenSpec requirement deltas and a new operational-readiness capability.
- Rationale: Requirements make completion objectively testable and archive-safe.
- Alternative considered: Keep only task checklists. Rejected due to weak long-term traceability.

3. Reuse existing capability boundaries instead of adding a new ops capability
- Decision: Keep this change limited to `mobile-auth-state-machine`, `auth-integration-verification`, and `auth-email-otp-passkey-contract`.
- Rationale: The remaining engineering work fits naturally into those capabilities.
- Alternative considered: Keep `auth-operational-readiness` in scope. Rejected because most of that work is procedural rather than code-enforceable.

4. Bind step-up enforcement to concrete actions already present in the product
- Decision: Require recent passkey step-up proofs for `passkey.register`, `passkey.delete`, and `finance.account.delete`.
- Rationale: These are existing destructive or persistence-changing actions with clear server enforcement points, so they deliver real protection without inventing new product surface area.
- Alternative considered: Gate the still-unimplemented account deletion flow first. Rejected because it is not yet a live action in this repo.

5. Align verification requirements to the live toolchain
- Decision: Replace stale Maestro/device-lane closeout language with verification requirements that point at API suites, web integration coverage, mobile Detox flows, and live status/auth checks.
- Rationale: The repo currently has active API and Detox-based auth verification lanes, while Maestro is no longer the primary mechanism.
- Alternative considered: Preserve Maestro language for continuity. Rejected because it no longer reflects the current repo surface area.

6. Re-scope stale callback language to current Better Auth mobile flow
- Decision: Replace PKCE/state-mismatch callback wording with validated auth deep-link/bootstrap semantics and refresh singleflight requirements.
- Rationale: The current mobile implementation does not rely on a custom PKCE callback flow, so literal PKCE/state requirements would be misleading and hard to verify.
- Alternative considered: Preserve historical callback wording. Rejected because it would optimize for plan continuity over correctness.

7. Keep live `/api/status` closeout as a verification gate, not an operational sign-off package
- Decision: Keep live health verification in scope, but limit the requirement to documented disposition of app-owned versus infrastructure-owned failures.
- Rationale: The health route still matters for auth readiness, but it should not drag broader operations governance into this change.
- Alternative considered: Remove live verification from scope. Rejected because a green local test suite alone is not enough.

## Risks / Trade-offs

- [Verification flakiness in live/mobile lanes] → Mitigation: gate on deterministic harness, rerun policy, and captured evidence artifacts.
- [Redirect and callback behavior remain inconsistent across apps] → Mitigation: centralize shared policy and test cross-app parity.
- [Scope creep into new auth features] → Mitigation: explicit non-goals and requirement boundaries.
- [Coordination overhead across API/mobile/web] → Mitigation: stage work by dependency and keep the scope code-enforceable.
- [Step-up requirements exceed current enforcement surface] → Mitigation: scope step-up completion to `passkey.register`, `passkey.delete`, and `finance.account.delete` for this change.
- [Task wording diverges from implementation reality] → Mitigation: align tasks/specs to current Better Auth and web route architecture before coding.

## Migration Plan

1. Tighten the existing auth capability deltas to match the real remaining engineering scope.
2. Implement runtime and policy changes for mobile refresh determinism, validated mobile bootstrap behavior, and web redirect/callback consistency.
3. Implement or explicitly de-scope OTP replay protection and passkey step-up requirements based on concrete enforcement surfaces.
4. Execute verification suites in order: API contract, web auth integration, mobile Detox auth flows, then live status/auth validation.
5. Capture the resulting engineering verification outcomes and leave broader operational sign-off artifacts to a separate closeout track.
6. Rollback strategy: if any gate fails, keep change open, revert unstable runtime adjustments, and re-run verification before closeout.

## Open Questions

- What is the minimum acceptable pass rate and retry policy for live/mobile auth gates?
- Who owns remediation for unresolved live `/api/status` upstream 5xx failures if application auth code is green?
