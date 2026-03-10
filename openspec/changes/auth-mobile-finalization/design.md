## Context

The consolidated auth/mobile plan dated 2026-03-09 reports core platform migration complete but leaves closeout work open in four areas: security hardening, final verification gates, mobile reliability confirmation, and formal production sign-off. Current risk is not missing foundation functionality, but a small number of concrete runtime/policy gaps plus lack of final operational evidence and runbook-complete controls.

The current implementation uses Better Auth as the underlying mobile/web auth substrate. Mobile passkey sign-in is driven by the Better Auth Expo client and token exchange, not a custom PKCE callback flow. Web auth routes across Finance, Notes, and Rocco share the same general shape but currently diverge on redirect validation and callback/error semantics. The closeout therefore needs to target the real remaining issues: refresh-token race safety, validated mobile auth deep-link/bootstrap handling, redirect allowlist enforcement, OTP replay handling in test/dev paths, passkey step-up enforcement, live verification ownership, and operations/security evidence capture.

## Goals / Non-Goals

**Goals:**
- Convert remaining in-progress auth/mobile items into explicit, testable requirements.
- Require deterministic mobile auth lifecycle behavior for deep-link/bootstrap handling and refresh scheduling.
- Require final cross-surface verification gates (API/live/mobile/Maestro/device lane) before closeout.
- Require operational readiness artifacts: key rotation drills, audit retention coverage, incident controls, and formal sign-off matrix.

**Non-Goals:**
- Rebuild or replace Better Auth foundations already marked complete.
- Add new auth factors beyond Apple, OTP, and passkey.
- Redesign existing auth table model or migration strategy.

## Decisions

1. Closeout as a dedicated change rather than updating historical plan text
- Decision: Create a net-new change focused on completion criteria.
- Rationale: Keeps implementation scope actionable and prevents re-opening already completed migration phases.
- Alternative considered: Continue in the monolithic plan file. Rejected because it blurs done vs remaining work.

2. Express completion through spec-level requirements, not checklist-only docs
- Decision: Encode remaining gates in OpenSpec requirement deltas and a new operational-readiness capability.
- Rationale: Requirements make completion objectively testable and archive-safe.
- Alternative considered: Keep only task checklists. Rejected due to weak long-term traceability.

3. Keep modified requirements additive where possible, strict where needed
- Decision: Tighten existing capabilities for state machine determinism, integration verification, and auth contract controls while introducing a new capability for ops readiness.
- Rationale: Preserves existing capability boundaries and reduces broad spec churn.
- Alternative considered: Consolidate all auth completion requirements into one new spec. Rejected because it duplicates existing capability ownership.

4. Define evidence-driven sign-off gate
- Decision: Require readiness matrix plus explicit disposition for all open criteria before marking complete.
- Rationale: Prevents “done” states without operational proof.
- Alternative considered: Code merge as implicit completion. Rejected due to operational risk.

5. Re-scope stale callback language to current Better Auth mobile flow
- Decision: Replace PKCE/state-mismatch callback wording with validated auth deep-link/bootstrap semantics and refresh singleflight requirements.
- Rationale: The current mobile implementation does not rely on a custom PKCE callback flow, so literal PKCE/state requirements would be misleading and hard to verify.
- Alternative considered: Preserve historical callback wording. Rejected because it would optimize for plan continuity over correctness.

6. Treat live `/api/status` closeout as a cross-surface readiness gate
- Decision: Keep live health verification as a blocking requirement, but explicitly allow the change to identify unresolved infrastructure-owned 5xx issues as external blockers rather than misclassifying them as application auth bugs.
- Rationale: The health route is part of auth readiness, but current 5xx symptoms may originate outside application auth code.
- Alternative considered: Remove live verification from scope. Rejected because sign-off still requires live readiness proof.

## Risks / Trade-offs

- [Verification flakiness in live/mobile lanes] → Mitigation: gate on deterministic harness, rerun policy, and captured evidence artifacts.
- [Operational work perceived as “non-feature” and deprioritized] → Mitigation: include blocking sign-off tasks in required completion path.
- [Scope creep into new auth features] → Mitigation: explicit non-goals and requirement boundaries.
- [Coordination overhead across API/mobile/ops] → Mitigation: stage work by dependency and assign owners per task group.
- [Step-up requirements exceed current enforcement surface] → Mitigation: scope step-up completion to concrete sensitive actions or explicitly de-scope with owner approval.
- [Task wording diverges from implementation reality] → Mitigation: align tasks/specs to current Better Auth and web route architecture before coding.

## Migration Plan

1. Add spec deltas for three existing auth capabilities and one new operational-readiness capability.
2. Implement missing runtime and policy changes for mobile refresh determinism, mobile auth entry validation, and web redirect/callback consistency.
3. Implement security contract changes for OTP replay protection and concrete passkey step-up enforcement or approved de-scope.
4. Execute verification suites in order: API contract, live status/auth, Maestro flows, EAS device smoke.
5. Complete operations controls (key rotation drill, audit retention validation, incident controls).
6. Publish final readiness matrix and obtain production sign-off.
7. Rollback strategy: if any gate fails, keep change open, revert unstable runtime adjustments, and re-run verification before sign-off.

## Open Questions

- Which team owns long-term key rotation drill cadence after this change closes?
- What is the minimum acceptable pass rate and retry policy for live/mobile auth gates?
- Should readiness evidence be stored in repo, CI artifacts, or both for audit retention?
- Which sensitive routes or actions are required to consume passkey step-up freshness before sign-off?
- Who owns remediation for unresolved live `/api/status` upstream 5xx failures if application auth code is green?
