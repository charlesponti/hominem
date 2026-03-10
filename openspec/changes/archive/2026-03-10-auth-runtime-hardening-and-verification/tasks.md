## 1. Mobile Auth Runtime Determinism

- [x] 1.1 Implement validated mobile auth deep-link/bootstrap handling so malformed or incomplete auth entry payloads fail closed
- [x] 1.2 Enforce deterministic refresh singleflight precedence to prevent overlapping refresh attempts from triggering replay revocation
- [x] 1.3 Add production guardrails for non-production E2E bootstrap endpoint usage and denial telemetry
- [x] 1.4 Add/update tests covering invalid mobile auth entry handling, refresh race handling, and guarded bootstrap behavior

## 2. Auth Contract And Route Security Tightening

- [x] 2.1 Implement redirect allowlist enforcement for auth callbacks across Finance, Notes, and Rocco
- [x] 2.2 Route OTP verification redirects through the shared safe-redirect policy across Finance, Notes, and Rocco
- [x] 2.3 Add OTP anti-replay enforcement in test/dev verification paths and structured security logging for replay attempts
- [x] 2.4 Enforce passkey step-up freshness requirements for concrete sensitive actions and add failure-path tests
- [x] 2.5 Validate consistent callback error contract across web auth entry/callback routes
 
## 3. Integration Verification Gates

- [x] 3.1 Run and document API auth contract suites for OTP and passkey lifecycle coverage
- [x] 3.2 Resolve or explicitly disposition live auth status endpoint health gate ownership, then re-verify with no unresolved sign-off-blocking 5xx
- [x] 3.3 Run web auth integration coverage across Finance, Notes, and Rocco for redirect fallback and passkey/OTP flows
- [x] 3.4 Run mobile Detox auth flows and fix selector or contract regressions
- [x] 3.5 Capture any optional personal-device smoke evidence outside the required completion path

## 4. Change Closeout

- [x] 4.1 Mark all engineering criteria complete or explicitly de-scoped with owner approval
- [x] 4.2 Record verification outcomes for the required API, web, mobile, and live auth gates
- [x] 4.3 Split any remaining operational sign-off work into a separate follow-up if it is still required
