# Auth Storage Ownership

## Better Auth canonical (`better_auth_*`)
- OAuth provider identities and tokens
- Better Auth browser/session state
- Better Auth passkeys
- Better Auth API keys
- Better Auth device authorization

## API token domain (`auth_sessions`, `auth_refresh_tokens`)
- Hominem API access/refresh token sessions
- Refresh-family rotation and replay protection

## Domain user mapping (`users`, `auth_subjects`)
- Product user profile record (`users`)
- Provider subject link history (`auth_subjects`)
- Deterministic link to Better Auth user (`users.better_auth_user_id`)
