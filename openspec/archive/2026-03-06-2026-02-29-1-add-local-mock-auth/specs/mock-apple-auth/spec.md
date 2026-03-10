## ADDED Requirements

### Requirement: Mock Apple Authentication Provider
The system SHALL provide a mock implementation of Apple Authentication that simulates the Sign in with Apple flow for local development without requiring real Apple credentials.

#### Scenario: Developer initiates mock sign in
- **WHEN** developer calls the mock Apple auth provider in local development
- **THEN** system returns a mock user object with simulated Apple auth response format

#### Scenario: Mock provider returns configured user data
- **WHEN** mock auth provider is initialized with custom user configuration
- **THEN** system returns the configured user data (email, name, etc.) in auth responses

#### Scenario: Mock auth handles token generation
- **WHEN** mock auth completes sign-in flow
- **THEN** system generates a mock authentication token that can be used for subsequent API calls

#### Scenario: Mock auth response matches real auth interface
- **WHEN** developer uses mock auth
- **THEN** system returns response in identical format to real Apple Auth (same user properties, token structure)

### Requirement: Environment-based Auth Provider Selection
The system SHALL select between mock and real Apple Authentication based on environment configuration.

#### Scenario: Local development uses mock auth
- **WHEN** application runs in local development (VITE_USE_MOCK_AUTH=true)
- **THEN** system uses mock authentication provider for all auth operations

#### Scenario: Staging environment uses real auth
- **WHEN** application runs on staging server (VITE_APPLE_AUTH_ENABLED=true)
- **THEN** system uses real Apple Authentication provider with configured credentials

#### Scenario: Configuration is read at startup
- **WHEN** application initializes
- **THEN** system reads environment variables and selects appropriate auth provider once

### Requirement: Configurable Mock User Data
The system SHALL allow developers to configure mock user data through environment variables or code.

#### Scenario: Mock user can have custom email
- **WHEN** developer sets mock user configuration
- **THEN** system uses configured email in all mock auth responses

#### Scenario: Multiple mock users can be predefined
- **WHEN** application provides list of mock users
- **THEN** developer can select which mock user to sign in as for testing different scenarios

#### Scenario: Mock user persists across page reloads
- **WHEN** developer signs in with mock auth
- **THEN** mock session persists in local storage and survives page reload
