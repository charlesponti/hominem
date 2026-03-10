## 1. Mobile Auth Runtime Determinism

- [ ] 1.1 Implement validated mobile auth deep-link/bootstrap handling so malformed or incomplete auth entry payloads fail closed
- [ ] 1.2 Enforce deterministic refresh singleflight precedence to prevent overlapping refresh attempts from triggering replay revocation
- [ ] 1.3 Add production guardrails for non-production E2E bootstrap endpoint usage and denial telemetry
- [ ] 1.4 Add/update tests covering invalid mobile auth entry handling, refresh race handling, and guarded bootstrap behavior

## 2. Auth Contract And Route Security Tightening

- [ ] 2.1 Implement redirect allowlist enforcement for auth callbacks across Finance, Notes, and Rocco
- [ ] 2.2 Add OTP anti-replay enforcement in test/dev verification paths and structured security logging for replay attempts
- [ ] 2.3 Enforce passkey step-up freshness requirements for concrete sensitive actions and add failure-path tests
- [ ] 2.4 Validate consistent callback error contract across web auth entry/callback routes

## 3. Integration Verification Gates

- [ ] 3.1 Run and document API auth contract suites for OTP and passkey lifecycle coverage
- [ ] 3.2 Resolve or explicitly disposition live auth status endpoint health gate ownership, then re-verify with no unresolved sign-off-blocking 5xx
- [ ] 3.3 Run Maestro auth flows in deterministic lane and fix selector/schema regressions
- [ ] 3.4 Execute personal-device EAS auth smoke checklist and attach evidence links

## 4. Operational Readiness And Security Controls

- [ ] 4.1 Execute signing key rotation drill with rollback validation and timestamped runbook evidence
- [ ] 4.2 Validate auth audit lifecycle coverage and map event classes to retention policy controls
- [ ] 4.3 Document emergency auth controls (force reauth, disable login, incident playbook)
- [ ] 4.4 Publish auth invariants/threat model updates and align route policy checks with default-deny expectations

## 5. Program Closeout

- [ ] 5.1 Publish cross-surface readiness matrix with pass/fail status and evidence links
- [ ] 5.2 Mark all open criteria complete or explicitly de-scoped with owner approval
- [ ] 5.3 Capture production sign-off decision and archive closeout artifacts
