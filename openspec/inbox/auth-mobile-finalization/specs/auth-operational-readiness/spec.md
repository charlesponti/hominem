## ADDED Requirements

### Requirement: Auth operational readiness package
The system SHALL produce and maintain an operational readiness package before auth/mobile finalization is marked complete.

#### Scenario: Readiness package published
- **WHEN** closeout is prepared
- **THEN** a readiness package SHALL include key rotation evidence, audit coverage status, incident controls summary, and verification run links

### Requirement: Signing key lifecycle drill
The system SHALL execute and document a non-disruptive signing key rotation drill with rollback steps.

#### Scenario: Rotation drill execution
- **WHEN** rotation drill is run in a non-production-safe manner
- **THEN** the system SHALL issue a replacement key, validate JWT/JWKS continuity, and confirm rollback readiness
- **AND** runbook timestamps and operator evidence SHALL be recorded

### Requirement: Auth audit visibility and retention coverage
The system SHALL provide complete lifecycle audit events for critical auth actions and map them to defined retention controls.

#### Scenario: Critical auth event coverage validated
- **WHEN** audit coverage is reviewed
- **THEN** login, logout, refresh, revoke, OTP request/verify, passkey register/verify, and step-up actions SHALL be present
- **AND** each event class SHALL map to an explicit retention policy

### Requirement: Final sign-off matrix is mandatory
The system SHALL require a cross-surface sign-off matrix before closeout completion.

#### Scenario: Program sign-off
- **WHEN** all required verification gates have passing evidence
- **THEN** the sign-off matrix SHALL mark each criterion as complete or explicitly de-scoped with owner approval
- **AND** the change SHALL remain open if any blocking criterion is unresolved
