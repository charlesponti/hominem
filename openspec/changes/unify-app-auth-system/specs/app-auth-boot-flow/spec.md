# app-auth-boot-flow Specification

## Purpose

Defines the deterministic boot flow for web and mobile apps. Ensures consistent session restoration without auth loops.

## ADDED Requirements

### Requirement: Web Boot Flow

Web apps SHALL use this boot sequence:

1. On page load, check if refresh token cookie exists
2. If no cookie, set state to `signed_out` and show `/auth`
3. If cookie exists, check memory for valid access token
4. If access token is valid (not expired), set state to `signed_in`
5. If access token is expired/missing, call `/api/auth/refresh`
6. If refresh succeeds, store new access token in memory, set state to `signed_in`
7. If refresh fails, clear cookie and set state to `signed_out`, show `/auth`

#### Scenario: Web boots with valid session

- **WHEN** web page loads
- **AND** refresh token cookie exists
- **AND** access token in memory is valid
- **THEN** user sees protected content immediately
- **AND** no loading spinner is shown (or minimal)

#### Scenario: Web boots needs refresh

- **WHEN** web page loads
- **AND** refresh token cookie exists
- **AND** access token is expired
- **THEN** app silently calls `/api/auth/refresh`
- **AND** if successful, shows protected content
- **AND** user experiences no visible interruption

#### Scenario: Web boots with no session

- **WHEN** web page loads
- **AND** no refresh token cookie exists
- **THEN** user is redirected to `/auth`
- **AND** sees email entry form

### Requirement: Mobile Boot Flow

Mobile apps SHALL use this boot sequence:

1. On app launch, read refresh token from SecureStore
2. If no refresh token, set state to `signed_out` and show auth flow
3. If refresh token exists, check for cached access token
4. If access token is valid (not expired), set state to `signed_in`
5. If access token is expired/missing, call `/api/auth/refresh`
6. If refresh succeeds, store new tokens in SecureStore, set state to `signed_in`
7. If refresh fails, clear tokens and set state to `signed_out`, show auth flow

#### Scenario: Mobile boots with valid session

- **WHEN** mobile app launches
- **AND** refresh token exists in SecureStore
- **AND** access token is cached and valid
- **THEN** user sees protected content immediately
- **AND** no auth screen is shown

#### Scenario: Mobile boots needs refresh

- **WHEN** mobile app launches
- **AND** refresh token exists in SecureStore
- **AND** access token is expired or missing
- **THEN** app calls `/api/auth/refresh` in background
- **AND** if successful, shows protected content

#### Scenario: Mobile boots with no session

- **WHEN** mobile app launches
- **AND** no refresh token in SecureStore
- **THEN** user sees auth entry screen

### Requirement: Boot Performance

Boot flow SHALL be optimized:

- If session check resolves in < 200ms, show signed-in content directly (no flash)
- If session check takes longer, show loading indicator
- Use optimistic UI: show signed-in shell first, then validate in background

#### Scenario: Fast boot shows no loading

- **WHEN** session validation completes in 150ms
- **THEN** user sees content immediately
- **AND** no loading spinner is visible

#### Scenario: Slow boot shows loading

- **WHEN** session validation takes 500ms
- **THEN** user sees loading indicator
- **AND** then sees signed-in content

### Requirement: No Boot Loops

Boot flow SHALL prevent auth loops:

- Never re-trigger auth check after successful sign-in until next app launch
- Never call `/api/auth/session` for token minting during boot (use refresh only)
- If refresh fails, show auth flow, don't retry automatically

#### Scenario: Refresh fails, show auth

- **WHEN** `/api/auth/refresh` returns 401
- **AND** refresh token is invalid/expired
- **THEN** clear all stored tokens
- **AND** show auth entry
- **AND** do not automatically retry

### Requirement: Next Parameter Support

Boot flow SHALL support redirect after auth:

- When redirecting to `/auth`, include `?next=<destination>` query param
- After successful sign-in, redirect to `next` destination
- Default to app root if no next specified

#### Scenario: Protected route redirects to auth with next

- **WHEN** unauthenticated user visits `/finance`
- **THEN** user is redirected to `/auth?next=/finance`
- **AND** after sign-in, redirected to `/finance`
