## ADDED Requirements

### Requirement: First-party session introspection does not mint a parallel app session
The system SHALL treat `GET /api/auth/session` as first-party session introspection and SHALL NOT require cookie-backed web, desktop, or mobile clients to depend on a derived bearer-style app session payload in order to remain authenticated.

#### Scenario: Cookie-backed first-party client restores session
- **WHEN** a first-party web, desktop, or mobile client calls `GET /api/auth/session` with a valid Better Auth session
- **THEN** the response confirms authenticated user identity and session-derived auth state
- **AND** the client restores signed-in state without requiring a new bearer token minted from that session

#### Scenario: Explicit machine-client flow requests bearer credentials
- **WHEN** a documented non-browser token client uses a token-oriented auth flow
- **THEN** the system may still issue or refresh bearer credentials for that client
- **AND** that behavior remains separate from ordinary first-party session introspection

### Requirement: First-party auth preserves continuation intent
The system SHALL preserve safe post-auth continuation intent across Notes web and desktop entry, verification, fallback, and change-email flows.

#### Scenario: Protected Notes route redirects through auth
- **WHEN** an unauthenticated Notes user requests a protected route with a safe in-app destination
- **THEN** the auth entry and verify flow preserve that destination
- **AND** successful sign-in returns the user to the intended route instead of a generic home destination

#### Scenario: User switches auth method mid-flow
- **WHEN** a user changes email or falls back between passkey and OTP during an in-progress auth flow
- **THEN** the system keeps the user in a valid auth entry state
- **AND** it preserves any safe continuation target that is still applicable

### Requirement: Logout reflects actual session invalidation outcome
The system SHALL make first-party logout behavior reflect whether Better Auth-backed session invalidation actually succeeded.

#### Scenario: Logout succeeds end-to-end
- **WHEN** a signed-in first-party client requests logout and Better Auth session invalidation succeeds
- **THEN** local auth state is cleared
- **AND** subsequent session restoration returns unauthenticated state

#### Scenario: Logout fails upstream
- **WHEN** a first-party client requests logout and upstream Better Auth session invalidation fails or is unreachable
- **THEN** the client does not silently claim a fully successful sign-out
- **AND** the user receives a deterministic recovery or retry path

### Requirement: Session recovery distinguishes expiry from transient failure
The system SHALL distinguish true unauthenticated session expiry from transient auth-recovery failures during app bootstrap and session revalidation.

#### Scenario: Mobile or web session probe times out
- **WHEN** a first-party client attempts to restore auth state and the session probe times out or the dependency is temporarily unavailable
- **THEN** the client enters a deterministic retryable auth-recovery state
- **AND** the UI does not silently present the user as definitively signed out unless session invalidity is confirmed

#### Scenario: Session is actually expired or revoked
- **WHEN** a first-party client attempts to restore auth state and the Better Auth session is invalid or revoked
- **THEN** the client transitions to unauthenticated state
- **AND** the user is routed back to the appropriate auth entry surface

### Requirement: CLI machine-client auth is explicit
The system SHALL present CLI authentication as an explicit machine-client token flow with consistent issuer and logout semantics.

#### Scenario: User authenticates CLI against a target base URL
- **WHEN** a user runs CLI login for a specific base URL
- **THEN** later authenticated CLI commands use credentials scoped to that issuer consistently
- **AND** the user does not appear successfully authenticated against one default host while commands target another

#### Scenario: User logs out from CLI
- **WHEN** a user logs out from the CLI
- **THEN** the CLI clearly communicates whether it cleared local credentials only or also invalidated remote auth state
- **AND** its messaging matches the actual guarantees of the machine-client flow
