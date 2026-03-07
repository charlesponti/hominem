## ADDED Requirements

### Requirement: Environment-based Configuration System
The system SHALL provide a configuration system that reads environment variables to determine whether to use mock or real authentication.

#### Scenario: Configuration loads from .env.local
- **WHEN** application starts in development
- **THEN** system loads VITE_USE_MOCK_AUTH and VITE_APPLE_AUTH_ENABLED from .env.local

#### Scenario: Production overrides use real auth
- **WHEN** building for production
- **THEN** system forces VITE_APPLE_AUTH_ENABLED=true and VITE_USE_MOCK_AUTH=false regardless of .env files

#### Scenario: Staging uses real auth with configuration
- **WHEN** application runs on staging server with environment variables set
- **THEN** system reads APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID from server environment

#### Scenario: Configuration is immutable after initialization
- **WHEN** application has started and selected auth provider
- **THEN** changing environment variables requires application restart to take effect

### Requirement: Conditional Auth Endpoint Routing
The system SHALL route authentication endpoints to mock or real implementations based on configuration.

#### Scenario: Sign-in endpoint uses correct provider
- **WHEN** request is made to /api/auth/signin
- **THEN** system routes to mock implementation if VITE_USE_MOCK_AUTH=true, otherwise to real implementation

#### Scenario: Callback endpoint handles both auth types
- **WHEN** authentication callback is received
- **THEN** system processes callback using the configured authentication provider

#### Scenario: Token validation works for both auth types
- **WHEN** token validation is requested
- **THEN** system validates token using appropriate provider (mock or real)

### Requirement: Development Environment Detection
The system SHALL correctly detect development, staging, and production environments.

#### Scenario: Local development detected
- **WHEN** application runs with NODE_ENV=development and no APPLE_CLIENT_ID
- **THEN** system defaults to mock authentication

#### Scenario: Staging detected with credentials
- **WHEN** application runs with APPLE_CLIENT_ID and APPLE_TEAM_ID set
- **THEN** system uses real authentication regardless of other variables
