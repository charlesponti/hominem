## ADDED Requirements

### Requirement: Conditional Authentication Endpoints
The system SHALL support conditional routing of authentication endpoints based on environment configuration.

#### Scenario: Mock auth endpoint registered
- **WHEN** application initializes with VITE_USE_MOCK_AUTH=true
- **THEN** system registers /api/auth/signin endpoint with mock authentication handler

#### Scenario: Real auth endpoint registered
- **WHEN** application initializes with APPLE_CLIENT_ID configured
- **THEN** system registers /api/auth/signin endpoint with real Apple authentication handler

#### Scenario: Auth endpoints have consistent interface
- **WHEN** either mock or real auth endpoint is called
- **THEN** both return identical response format with user object and session token

#### Scenario: Token validation works across auth types
- **WHEN** token is validated on backend
- **THEN** system validates token correctly whether it came from mock or real auth provider

### Requirement: Shared Auth Types
The system SHALL provide shared TypeScript types for authentication that work with both mock and real implementations.

#### Scenario: User type is consistent
- **WHEN** real auth returns user object
- **WHEN** mock auth returns user object
- **THEN** both use identical User type shape (id, email, name, etc.)

#### Scenario: Session type is consistent
- **WHEN** authentication completes
- **THEN** system returns Session type with user and token properties consistent across both auth types

#### Scenario: Auth response types are exported
- **WHEN** client code imports auth types from @hominem/hono-rpc
- **THEN** types are available and consistent for TypeScript type safety
