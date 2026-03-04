## REMOVED Requirements

### Requirement: Legacy account table
**Reason**: Replaced by unified user_account from better-auth
**Migration**: Use user_account table

### Requirement: Legacy auth tables (authSubjects, authSessions, authRefreshTokens, authPasskeys, authDeviceCodes)
**Reason**: Replaced by better-auth tables (user_session, user_account, user_passkey, user_api_key, user_verification, user_device_code)
**Migration**: Use user_* tables

## ADDED Requirements

### Requirement: Users table as canonical identity
The `users` table MUST be the single source of truth for user identity. All authentication and profile data MUST be linked through this table.

#### Scenario: User created via authentication
- **WHEN** a user completes authentication (OAuth, passkey, password, etc.)
- **THEN** a record is created in the `users` table with at minimum email and id

#### Scenario: User profile accessed
- **WHEN** any service queries user profile
- **THEN** the query returns data from the `users` table

### Requirement: User authentication tables follow naming convention
All authentication-related tables MUST use the `user_*` prefix and be linked to `users` via foreign key.

#### Scenario: Session table structure
- **WHEN** a session is created for a user
- **THEN** a record is created in `user_session` with `user_id` FK to `users.id`

#### Scenario: Account linking
- **WHEN** user links an OAuth provider
- **THEN** account is stored in `user_account` table with `user_id` FK to `users.id`

### Requirement: Password hash storage
The `users` table MUST support storing password hashes for future email/password authentication.

#### Scenario: Password set on user
- **WHEN** user sets a password
- **THEN** `password_hash` column in `users` table contains the hash

#### Scenario: Password removed
- **WHEN** user removes password (OAuth-only user)
- **THEN** `password_hash` column is NULL
