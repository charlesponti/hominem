## ADDED Requirements

### Requirement: Better Auth is the single first-party app session authority
The system SHALL treat a valid Better Auth session as the only authenticated session contract for first-party web and mobile applications.

#### Scenario: Web app loads with valid Better Auth session
- **WHEN** a first-party web app receives a request with a valid Better Auth session
- **THEN** server auth resolution returns an authenticated user state
- **AND** the app does not require `hominem_access_token` or `hominem_refresh_token` cookies to consider the user signed in

#### Scenario: Mobile app restores valid Better Auth session
- **WHEN** the mobile app starts with valid Better Auth-managed session state in supported storage
- **THEN** the app restores authenticated user state from that session
- **AND** the app does not require a second custom token pair to complete bootstrap

### Requirement: First-party app logout clears Better Auth session state
The system SHALL sign first-party web and mobile users out by clearing Better Auth-managed session state and SHALL not depend on clearing a second app-session cookie pair.

#### Scenario: Web logout clears active session
- **WHEN** a signed-in web user submits logout
- **THEN** the active Better Auth session is invalidated
- **AND** subsequent session lookup returns unauthenticated state

#### Scenario: Mobile logout clears restored session
- **WHEN** a signed-in mobile user requests logout
- **THEN** Better Auth-managed local session state is cleared
- **AND** the next app bootstrap returns unauthenticated state

### Requirement: Non-app bearer token flows are explicitly scoped
The system SHALL keep any remaining custom bearer-token issuance paths scoped to explicit non-browser or machine-client use cases and SHALL not require them for ordinary first-party app sign-in.

#### Scenario: First-party app sign-in completes without custom token issuance
- **WHEN** a user signs in through a supported web or mobile app flow
- **THEN** the system establishes authenticated app state through Better Auth session persistence
- **AND** ordinary app session recovery does not depend on custom token exchange endpoints

#### Scenario: Explicit machine-client flow requests bearer token
- **WHEN** a supported non-app client invokes a documented token-oriented auth flow
- **THEN** the system may issue or rotate a bearer-token contract for that caller
- **AND** that behavior remains isolated from ordinary app session handling
