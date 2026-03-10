## MODIFIED Requirements

### Requirement: API auth contract integration suite
The system MUST provide integration tests that validate API contract behavior for email OTP and passkey flows, including redirect policy, replay handling, and live endpoint readiness checks for closeout.

#### Scenario: API contract suite validates OTP lifecycle
- **WHEN** API integration tests run for auth OTP contract coverage
- **THEN** tests assert OTP request, OTP verification success, and failure modes (invalid/expired)
- **AND** tests assert authenticated session state only after successful verification
- **AND** tests assert replayed OTP verification attempts fail deterministically where replay protection is implemented

#### Scenario: API contract suite validates passkey lifecycle
- **WHEN** API integration tests run for passkey contract coverage
- **THEN** tests assert registration authorization boundaries and successful registration/authentication flows
- **AND** tests assert failure behavior for malformed or invalid passkey assertions

#### Scenario: Live auth status gate is green
- **WHEN** closeout verification runs against live auth status endpoints
- **THEN** required health/status checks SHALL return successful responses
- **AND** unresolved `5xx` responses SHALL block sign-off
- **AND** any unresolved upstream or infrastructure-owned failure SHALL be explicitly recorded with owner and disposition

### Requirement: Browser auth integration suites across apps
The system MUST provide browser integration tests for complete auth journeys in Finance, Notes, and Rocco, and MUST include deterministic mobile Detox validation.

#### Scenario: Email OTP journey validated per app
- **WHEN** browser integration suites execute for each web app
- **THEN** each suite validates request OTP, verify OTP, and post-login authenticated app state
- **AND** each suite validates logout returning to unauthenticated state
- **AND** each suite validates redirect fallback behavior for disallowed or malformed `next` destinations

#### Scenario: Passkey journey validated per app
- **WHEN** browser integration suites execute for each web app with passkey harness enabled
- **THEN** each suite validates passkey enrollment and passkey sign-in
- **AND** each suite validates fallback behavior to email OTP when passkey path is unavailable

#### Scenario: Mobile auth Detox journey is stable
- **WHEN** mobile auth Detox flows run in CI and local deterministic lane
- **THEN** flows SHALL complete without selector drift or contract regressions
- **AND** failures SHALL include actionable diagnostics for rerun
