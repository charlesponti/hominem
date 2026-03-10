# auth-email-otp-passkey-contract Specification

## Purpose
TBD - synced from change harden-auth-email-otp-passkey-e2e. Update Purpose after the capability is finalized.
## Requirements
### Requirement: Email OTP bootstrap authentication
The system SHALL allow a user to initiate authentication via email OTP and SHALL complete authentication only after successful OTP verification.

#### Scenario: OTP requested successfully
- **WHEN** a user submits a valid email address to the email OTP request endpoint
- **THEN** the system sends a one-time code to that email
- **AND** the system returns a success response suitable for progressing to OTP verification

#### Scenario: OTP verification establishes session
- **WHEN** a user submits a valid unexpired OTP for a pending authentication attempt
- **THEN** the system establishes an authenticated session
- **AND** subsequent session lookup returns an authenticated user state

#### Scenario: OTP verification fails for invalid code
- **WHEN** a user submits an invalid OTP
- **THEN** the system rejects the verification attempt
- **AND** no authenticated session is created

#### Scenario: OTP verification fails for expired code
- **WHEN** a user submits an OTP that has expired
- **THEN** the system rejects the verification attempt as expired
- **AND** the user can request a new OTP

### Requirement: Passkey enrollment requires authenticated session
The system SHALL allow passkey enrollment only for an already authenticated user session.

#### Scenario: Unauthenticated passkey enrollment is rejected
- **WHEN** an unauthenticated client requests passkey registration options
- **THEN** the system returns an unauthorized response

#### Scenario: Authenticated passkey enrollment succeeds
- **WHEN** an authenticated user completes passkey registration options and verification successfully
- **THEN** the system persists the passkey credential for that user
- **AND** the user remains authenticated

### Requirement: Returning users can sign in with passkey
The system SHALL support passkey-based sign-in for users with registered passkeys.

#### Scenario: Passkey sign-in succeeds
- **WHEN** a user with a registered passkey completes passkey authentication challenge verification
- **THEN** the system establishes an authenticated session
- **AND** session lookup returns authenticated user state

#### Scenario: Passkey sign-in falls back to OTP
- **WHEN** passkey sign-in is unavailable or no credential is found for the user flow
- **THEN** the system provides a fallback path to email OTP sign-in

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

