# auth-system-cleanup Specification

## Purpose
TBD - created by archiving change phased-db-redesign. Update Purpose after archive.
## Requirements
### Requirement: Users table as canonical identity
The `users` table MUST be the single source of truth for user identity. All authentication and profile data MUST be linked through this table.

#### Scenario: User created via authentication
- **WHEN** a user completes authentication (OAuth, passkey, password, etc.)
- **THEN** a record is created in the `users` table with at minimum email and id

#### Scenario: User profile accessed
- **WHEN** any service queries user profile
- **THEN** the query returns data from the `users` table

### Requirement: User authentication tables follow naming convention
All authentication-related tables MUST use the `user_*` prefix and MUST be linked to `users` via foreign key. Auth subject/session mapping logic MUST be method-agnostic for primary web authentication methods (email OTP and passkey) and MUST NOT require OAuth-provider assumptions in generic session resolution.

#### Scenario: Session table structure
- **WHEN** a session is created for a user
- **THEN** a record is created in `user_sessions` with `user_id` FK to `users.id`

#### Scenario: Account linking
- **WHEN** user links an external provider account
- **THEN** account is stored in `user_accounts` table with `user_id` FK to `users.id`

#### Scenario: Email OTP session mapping
- **WHEN** a user authenticates via verified email OTP
- **THEN** generic session resolution maps to internal `users` identity without requiring OAuth provider labels

#### Scenario: Passkey session mapping
- **WHEN** a user authenticates via passkey
- **THEN** generic session resolution maps to internal `users` identity without requiring OAuth provider labels

### Requirement: Password hash storage
The `users` table MUST support storing password hashes for future email/password authentication.

#### Scenario: Password set on user
- **WHEN** user sets a password
- **THEN** `password_hash` column in `users` table contains the hash

#### Scenario: Password removed
- **WHEN** user removes password (OAuth-only user)
- **THEN** `password_hash` column is NULL
