# app-auth-routes Specification

## Purpose

Defines the canonical route structure for web auth surfaces. All web apps SHALL use these routes to ensure consistent user experience.

## ADDED Requirements

### Requirement: Canonical Auth Routes

All web apps SHALL implement these exact routes:

- `GET /auth` - Auth entry (email input or passkey)
- `POST /auth` - Action to send OTP or initiate passkey
- `GET /auth/verify` - OTP code entry (requires email query param)
- `POST /auth/verify` - Action to verify OTP code
- `POST /auth/logout` - Action to sign out
- `GET /settings/security` - Security settings (signed-in only)

#### Scenario: Unauthenticated user visits root

- **WHEN** unauthenticated user visits `/`
- **THEN** app redirects to `/auth`
- **AND** user sees email entry form

#### Scenario: Authenticated user visits root

- **WHEN** authenticated user visits `/`
- **AND** session is valid
- **THEN** app shows protected content

#### Scenario: Authenticated user visits /auth

- **WHEN** authenticated user visits `/auth`
- **THEN** app redirects to `/` (or app home)

#### Scenario: User visits /auth/verify without email

- **WHEN** user visits `/auth/verify` without `?email=` query param
- **THEN** app redirects to `/auth`

### Requirement: Route Transitions

Auth routes SHALL follow these transition patterns:

- `/auth` → `/auth/verify?email=user@example.com` on OTP send success
- `/auth/verify` → `/` (or app home) on verify success
- Any auth route → `/auth` on sign out

#### Scenario: Successful OTP request

- **WHEN** user enters email and submits on `/auth`
- **AND** OTP is sent successfully
- **THEN** app redirects to `/auth/verify?email=user@example.com`
- **AND** code entry form is shown with masked email

#### Scenario: Successful OTP verification

- **WHEN** user enters valid code on `/auth/verify`
- **AND** verification succeeds
- **THEN** app redirects to `/` (or app home)
- **AND** user is signed in

#### Scenario: User clicks sign out

- **WHEN** signed-in user clicks "Sign out"
- **AND** sign out action is submitted
- **THEN** credentials are cleared
- **AND** app redirects to `/auth`

### Requirement: Protected Route Guard

All protected routes (app-specific routes) SHALL redirect to `/auth` when not authenticated:

- App MUST check auth state before rendering protected content
- If not authenticated, redirect to `/auth` with `?next=<intended-destination>` query param
- After successful sign-in, redirect to the `next` destination

#### Scenario: Protected route access without auth

- **WHEN** unauthenticated user visits `/finance` (protected)
- **THEN** app redirects to `/auth?next=/finance`

#### Scenario: After sign-in, redirect to intended destination

- **WHEN** user signs in on `/auth`
- **AND** original request was to `/auth?next=/finance`
- **THEN** app redirects to `/finance`
