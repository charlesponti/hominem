# app-auth-passkey-flow Specification

## Purpose

Defines the unified passkey authentication and enrollment UX within the app auth system.

## ADDED Requirements

### Requirement: Passkey as Secondary Entry

Passkey SHALL be a secondary authentication method:

- Email OTP is the default first-time entry point
- "Use a passkey" is visible on `/auth` screen as secondary action
- Passkey is NOT shown as primary until user has enrolled

#### Scenario: First-time user sees auth entry

- **WHEN** user visits `/auth` for first time
- **THEN** email entry is primary
- **AND** "Use a passkey" is shown as secondary option

#### Scenario: Returning user with passkey

- **WHEN** user visits `/auth`
- **AND** user has enrolled passkey in past
- **THEN** "Use a passkey" is elevated or prominent
- **AND** email entry remains available

### Requirement: Passkey Authentication Flow

Passkey authentication SHALL:

1. User clicks "Use a passkey"
2. App calls `/api/auth/passkey/auth/options` to get passkey challenge/options
3. Browser/device prompts for passkey
4. User authenticates with fingerprint/face/device pass
5. App calls `/api/auth/passkey/auth/verify` with assertion
6. API verifies passkey identity through Better Auth
7. API issues the canonical Hominem token pair
8. On success, user is signed in with tokens

#### Scenario: Successful passkey sign-in

- **WHEN** user selects passkey
- **AND** authenticates successfully
- **THEN** API returns `{ user, accessToken, refreshToken, expiresIn, tokenType }`
- **AND** user is signed in
- **AND** sees protected content

#### Scenario: Mobile and web complete sign-in identically

- **WHEN** user authenticates with passkey on web or mobile
- **THEN** both platforms receive the same canonical app token contract
- **AND** both platforms transition through the same auth state machine to `signed_in`
- **AND** platform differences are limited to token storage and device prompt behavior

### Requirement: Passkey Identity Shall Bridge Into App Session

Passkey SHALL be treated as an identity proof mechanism, not a separate runtime session model:

- Better Auth verifies the passkey assertion
- Hominem auth issues app tokens after successful verification
- `/api/auth/session` SHALL NOT be used to mint tokens after passkey sign-in

#### Scenario: Passkey verify endpoint bridges identity into app tokens

- **WHEN** `/api/auth/passkey/auth/verify` succeeds
- **THEN** the response includes the same canonical token payload shape as OTP verify
- **AND** apps do not need a follow-up token minting call

#### Scenario: Session endpoint remains identity-only

- **WHEN** app calls `/api/auth/session`
- **THEN** it only returns identity/session inspection data
- **AND** it does not mint access or refresh tokens for passkey flows

#### Scenario: Passkey authentication fails

- **WHEN** user selects passkey
- **AND** authentication fails or is cancelled
- **THEN** error shows "Passkey sign-in failed. Try again or use email."
- **AND** user can retry passkey or use email OTP

### Requirement: Passkey Enrollment Prompt

After successful OTP sign-in, apps SHALL prompt users to enroll a passkey:

- Prompt is non-blocking (can dismiss)
- Prompt shows after first successful OTP sign-in
- Prompt allows "Create passkey" or "Not now"

#### Scenario: First OTP sign-in shows enrollment

- **WHEN** user signs in with email OTP for first time
- **AND** user does not have passkey enrolled
- **THEN** non-blocking prompt shows "Make next sign-in instant"
- **AND** "Create passkey" and "Not now" options

#### Scenario: User creates passkey

- **WHEN** user clicks "Create passkey"
- **AND** completes WebAuthn registration
- **THEN** passkey is enrolled
- **AND** success message shows "Passkey created"

#### Scenario: User skips enrollment

- **WHEN** user clicks "Not now"
- **THEN** prompt dismisses
- **AND** does not reappear on this device

### Requirement: Passkey Registration Flow

Passkey registration SHALL:

1. User initiates from settings or enrollment prompt
2. App calls `/api/auth/passkey/register/options` (requires auth)
3. Browser/device prompts to create passkey
4. User completes device authentication
5. App calls `/api/auth/passkey/register/verify` with attestation
6. On success, passkey is associated with user account

Passkey registration MAY rely on Better Auth session continuity in addition to canonical app tokens, but app tokens remain the primary app auth model.

#### Scenario: User creates passkey in settings

- **WHEN** signed-in user goes to `/settings/security`
- **AND** clicks "Add passkey"
- **THEN** WebAuthn registration flow starts
- **AND** on success, passkey appears in user's security settings

#### Scenario: Enrollment depends on Better Auth session continuity

- **WHEN** app initiates passkey registration after OTP sign-in
- **THEN** the system MAY use Better Auth session continuity for plugin challenge verification
- **AND** this does not replace or weaken the canonical Hominem token model

### Requirement: Passkey Management

Users SHALL be able to manage passkeys:

- View list of enrolled passkeys (with device names)
- Delete individual passkeys
- Passkeys are device-specific

Passkey management endpoints MAY depend on Better Auth session continuity until they are fully wrapped behind Bearer-authenticated app APIs.

#### Scenario: User views passkeys

- **WHEN** signed-in user visits `/settings/security`
- **AND** user has passkeys enrolled
- **THEN** list shows each passkey with device name
- **AND** "Delete" option for each

#### Scenario: User deletes passkey

- **WHEN** user clicks delete on a passkey
- **AND** confirms deletion
- **THEN** passkey is removed
- **AND** user must use email OTP or create new passkey

### Requirement: Passkey Browser Compatibility

Apps SHALL handle browsers without WebAuthn:

- Detect WebAuthn support before showing passkey option
- Gracefully hide passkey option on unsupported browsers
- Show clear message if passkey fails due to incompatibility

#### Scenario: Unsupported browser

- **WHEN** user visits `/auth` on browser without WebAuthn
- **THEN** "Use a passkey" option is hidden or disabled
- **AND** email OTP is the only sign-in option
