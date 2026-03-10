# app-auth-token-model Specification

## Purpose

Defines the single token model used by all first-party apps, including storage strategy by platform. This ensures consistent credential handling across mobile and web.

## ADDED Requirements

### Requirement: Token Structure

All apps SHALL use this token structure:

- `accessToken`: Short-lived JWT (15 minutes default)
- `refreshToken`: Long-lived rotating token (30 days default)
- `expiresIn`: Seconds until accessToken expires

#### Scenario: Sign-in returns tokens

- **WHEN** user successfully signs in via email OTP or passkey
- **THEN** API returns `{ accessToken, refreshToken, expiresIn, tokenType }`
- **AND** accessToken is used for all subsequent protected API calls
- **AND** refreshToken is stored for session restoration

#### Scenario: OTP and passkey share one token contract

- **WHEN** user signs in with email OTP
- **OR** user signs in with passkey
- **THEN** both flows return the same canonical token payload shape
- **AND** apps store tokens using the same platform rules

### Requirement: Sign-In Endpoints Mint Tokens Directly

Sign-in endpoints SHALL mint app tokens directly at sign-in completion time.

- `/api/auth/email-otp/verify` SHALL return the canonical token payload
- `/api/auth/passkey/auth/verify` SHALL return the canonical token payload
- `/api/auth/session` SHALL remain identity-only and SHALL NOT mint app tokens

#### Scenario: Passkey sign-in completes without secondary mint call

- **WHEN** user successfully authenticates with passkey
- **THEN** `/api/auth/passkey/auth/verify` returns the canonical token payload directly
- **AND** app does not perform a follow-up token minting request

#### Scenario: Session endpoint is not used for token issuance

- **WHEN** app inspects current auth state with `/api/auth/session`
- **THEN** it receives identity/session inspection information only
- **AND** no new app tokens are issued

### Requirement: Token Storage by Platform

Token storage SHALL follow platform-specific security requirements:

**Mobile:**
- `refreshToken`: MUST be stored in `SecureStore` (encrypted)
- `accessToken`: SHOULD be in memory only, MAY cache encrypted for cold boot

**Web:**
- `refreshToken`: MUST be stored in `HttpOnly Secure SameSite=Lax` cookie
- `accessToken`: MUST be in memory only (never in localStorage or cookie)

Apps MAY preserve Better Auth session cookies/session cache in parallel when required for passkey plugin operations, but those cookies are not the canonical app session credential.

#### Scenario: Mobile stores refresh token

- **WHEN** user signs in on mobile
- **THEN** refreshToken is stored in SecureStore
- **AND** accessToken is kept in memory

#### Scenario: Web stores refresh token

- **WHEN** user signs in on web
- **THEN** refreshToken is set as HttpOnly cookie
- **AND** accessToken is kept in memory JavaScript variable

#### Scenario: Better Auth session continuity exists in parallel

- **WHEN** passkey enrollment or passkey management requires Better Auth plugin session state
- **THEN** Better Auth session continuity MAY be preserved in parallel
- **AND** protected app APIs still use the Hominem access token Bearer model

### Requirement: Token Refresh Flow

When accessToken expires:

1. App calls `POST /api/auth/refresh` with refreshToken
2. API validates refreshToken and issues new pair
3. App stores new tokens
4. Failed refresh redirects to sign-in

#### Scenario: Access token expires during use

- **WHEN** protected API returns 401
- **AND** refreshToken is available
- **THEN** app automatically calls `/api/auth/refresh`
- **AND** retries original request with new accessToken
- **AND** user sees no interruption

#### Scenario: Refresh token expired

- **WHEN** refresh token is invalid or expired
- **AND** `/api/auth/refresh` returns 401
- **THEN** app clears stored credentials
- **AND** redirects to auth entry

### Requirement: Sign-Out Clears All Tokens

Sign-out MUST clear all stored tokens:

#### Scenario: User signs out

- **WHEN** user initiates sign out
- **THEN** refreshToken is removed from storage/cookie
- **AND** accessToken is cleared from memory
- **AND** app redirects to auth entry

### Requirement: Token Validation

Protected API calls SHALL include accessToken in the Authorization header:

```
Authorization: Bearer <accessToken>
```

#### Scenario: API call with valid token

- **WHEN** app makes request with valid Bearer token
- **THEN** API accepts request
- **AND** returns protected data

#### Scenario: API call without token

- **WHEN** app makes request without Authorization header
- **THEN** API returns 401
- **AND** app redirects to auth entry

#### Scenario: API call with invalid token

- **WHEN** app makes request with invalid/expired Bearer token
- **THEN** API returns 401
- **AND** app attempts refresh
- **AND** if refresh fails, redirects to auth entry
