## MODIFIED Requirements

### Requirement: Auth state machine initializes correctly
The system SHALL initialize the authentication state machine on app startup and transition through states deterministically, including Better Auth-backed auth entry and session recovery paths.

#### Scenario: Fresh app start with no session
- **WHEN** the app starts with no existing session
- **THEN** the state machine SHALL start in `BOOTING` state
- **AND** after session check completes, SHALL transition to `UNAUTHENTICATED`
- **AND** the UI SHALL show the auth screen

#### Scenario: Fresh app start with valid session
- **WHEN** the app starts with a valid existing Better Auth session
- **THEN** the state machine SHALL start in `BOOTING` state
- **AND** after session loads, SHALL transition to `AUTHENTICATED`
- **AND** the UI SHALL show the protected content

#### Scenario: Session expires during app use
- **WHEN** the user is authenticated
- **AND** the Better Auth session expires or is revoked
- **THEN** the state machine SHALL transition to `UNAUTHENTICATED`
- **AND** the UI SHALL redirect to the auth screen

#### Scenario: Mobile auth entry includes malformed or incomplete auth payload
- **WHEN** a mobile auth deep link or bootstrap payload is malformed, incomplete, or unsupported
- **THEN** the state machine SHALL reject auth completion deterministically
- **AND** SHALL transition to `UNAUTHENTICATED` with typed error context
- **AND** SHALL NOT leave partial authenticated state

### Requirement: Auth state machine handles concurrent operations safely
The system SHALL handle multiple simultaneous auth operations without race conditions or inconsistent state, and SHALL enforce deterministic session recovery precedence.

#### Scenario: Sign in requested while session loading
- **WHEN** a sign-in is requested
- **AND** a session check is in progress
- **THEN** the new sign-in SHALL queue or cancel the pending check
- **AND** the final state SHALL reflect the most recent operation

#### Scenario: Sign out during sync operation
- **WHEN** user data is being synchronized
- **AND** user requests sign out
- **THEN** sync operations SHALL be cancelled
- **AND** state SHALL transition to `UNAUTHENTICATED` cleanly
- **AND** no partial data SHALL remain in state

#### Scenario: Concurrent session consumers observe bootstrap recovery
- **WHEN** multiple app requests observe session recovery at the same time
- **THEN** only one recovery request path SHALL execute against the underlying Better Auth session state
- **AND** waiting consumers SHALL reuse the successful result
- **AND** duplicate recovery attempts SHALL be ignored or cancelled safely without revoking the session
