## MODIFIED Requirements

### Requirement: Auth route behavior is consistent across web apps
Finance, Notes, and Rocco SHALL expose consistent auth entry and callback semantics for email OTP and passkey journeys, with explicit redirect and state integrity controls.

#### Scenario: Unauthenticated user reaches protected route
- **WHEN** an unauthenticated user navigates to a protected route in any web app
- **THEN** the app redirects to its configured auth entry route
- **AND** that route supports progressing through the email OTP journey

#### Scenario: Auth callback normalizes post-auth redirect
- **WHEN** auth callback route receives a successful auth response with optional next target
- **THEN** the app redirects to a validated in-app destination
- **AND** callback error states are propagated in a consistent query-param contract

#### Scenario: Redirect target is outside allowlist
- **WHEN** callback includes a destination outside configured redirect allowlist
- **THEN** the destination SHALL be rejected
- **AND** the app SHALL fall back to a safe default in-app route
- **AND** an audit/security signal SHALL be emitted

#### Scenario: Email OTP and passkey routes fail consistently
- **WHEN** auth entry, verify, or callback routes encounter invalid input or downstream auth failure
- **THEN** each app SHALL expose the same normalized callback/error contract for client handling
- **AND** each route SHALL avoid redirecting to unvalidated destinations

## ADDED Requirements

### Requirement: OTP and passkey step-up protections
The system SHALL enforce anti-replay safeguards for OTP verification and passkey step-up safeguards for sensitive operations.

#### Scenario: Replayed OTP verify attempt
- **WHEN** an OTP verify attempt reuses an already consumed token
- **THEN** verification SHALL fail with deterministic security error semantics
- **AND** the attempt SHALL be logged for anomaly analysis

#### Scenario: Sensitive operation requires fresh passkey step-up
- **WHEN** a user initiates a sensitive action requiring elevated assurance
- **THEN** the system SHALL require a valid recent passkey step-up proof for that action
- **AND** missing or stale step-up proofs SHALL block the action
- **AND** this change SHALL enforce that behavior for `passkey.register`, `passkey.delete`, and `finance.account.delete`
