## MODIFIED Requirements

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
