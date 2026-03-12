# cli-auth-device-flow Specification

## Purpose
TBD - synced from change pure-better-auth-cli-flow. Update Purpose after the capability is finalized.

## Requirements
### Requirement: CLI device login uses stable first-party Better Auth routes
The system SHALL expose stable first-party device authorization routes for CLI
callers and SHALL return a verification URI rooted at `/api/auth/device`.

#### Scenario: Device code response returns stable verification URI
- **WHEN** a CLI client requests a device code from `/api/auth/device/code`
- **THEN** the response includes a verification URI whose path is `/api/auth/device`
- **AND** the response includes a verification URI complete value that preserves the issued user code

### Requirement: CLI device token exchange preserves Better Auth bearer headers
The system SHALL preserve Better Auth auth headers on device token exchange
responses so CLI callers can store the Better Auth bearer token directly.

#### Scenario: Approved device token response exposes bearer token
- **WHEN** an approved CLI device code is exchanged through `/api/auth/device/token`
- **THEN** the response forwards the Better Auth `set-auth-token` header
- **AND** the response body remains the Better Auth device-token payload

### Requirement: CLI bearer auth uses Better Auth session resolution
Protected API routes SHALL accept Better Auth bearer tokens for CLI requests and
authenticate them before attempting the legacy custom JWT verifier.

#### Scenario: Better Auth bearer reaches protected route
- **WHEN** a CLI request sends a valid Better Auth bearer token to a protected API route
- **THEN** the API resolves the authenticated user and session from Better Auth
- **AND** the request succeeds without requiring a legacy custom JWT

#### Scenario: Legacy JWT bearer remains valid
- **WHEN** a non-CLI caller sends a valid legacy custom JWT bearer token to a protected API route
- **THEN** the API continues authenticating the request successfully

### Requirement: CLI auth status distinguishes stored and valid auth state
The CLI SHALL report stored Better Auth bearer state separately from remotely
validated authenticated state.

#### Scenario: Stored bearer is invalid remotely
- **WHEN** the CLI has a stored Better Auth bearer token that the server rejects
- **THEN** `auth status` reports `tokenStored` as true
- **AND** `authenticated` as false
- **AND** protected CLI commands instruct the user to run `hominem auth login`
