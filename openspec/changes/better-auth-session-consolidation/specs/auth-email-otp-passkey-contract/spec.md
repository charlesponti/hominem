## MODIFIED Requirements

### Requirement: Email OTP bootstrap authentication
The system SHALL allow a user to initiate authentication via email OTP and SHALL complete authentication only after successful OTP verification.

#### Scenario: OTP requested successfully
- **WHEN** a user submits a valid email address to the email OTP request endpoint
- **THEN** the system sends a one-time code to that email
- **AND** the system returns a success response suitable for progressing to OTP verification

#### Scenario: OTP verification establishes session
- **WHEN** a user submits a valid unexpired OTP for a pending authentication attempt
- **THEN** the system establishes a Better Auth-managed authenticated session
- **AND** subsequent session lookup returns an authenticated user state for first-party web and mobile apps

#### Scenario: OTP verification fails for invalid code
- **WHEN** a user submits an invalid OTP
- **THEN** the system rejects the verification attempt
- **AND** no authenticated session is created

#### Scenario: OTP verification fails for expired code
- **WHEN** a user submits an OTP that has expired
- **THEN** the system rejects the verification attempt as expired
- **AND** the user can request a new OTP

### Requirement: Returning users can sign in with passkey
The system SHALL support passkey-based sign-in for users with registered passkeys.

#### Scenario: Passkey sign-in succeeds
- **WHEN** a user with a registered passkey completes passkey authentication challenge verification
- **THEN** the system establishes a Better Auth-managed authenticated session
- **AND** session lookup returns authenticated user state for first-party web and mobile apps

#### Scenario: Passkey sign-in falls back to OTP
- **WHEN** passkey sign-in is unavailable or no credential is found for the user flow
- **THEN** the system provides a fallback path to email OTP sign-in
