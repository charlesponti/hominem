# app-auth-mobile-screens Specification

## Purpose

Defines the canonical mobile auth screen/step model. Mobile apps SHALL use these screens to ensure consistent user experience with web auth.

## ADDED Requirements

### Requirement: Canonical Mobile Auth Screens

Mobile apps SHALL implement these screens/steps:

- `/(auth)/index` - Auth entry (email input or passkey)
- `/(auth)/verify` - OTP code entry

#### Scenario: Mobile app boots without credentials

- **WHEN** mobile app launches with no stored refresh token
- **THEN** user sees `/(auth)/index` screen
- **AND** email input form is shown

#### Scenario: Mobile app boots with valid credentials

- **WHEN** mobile app launches with valid refresh token
- **AND** access token is valid or refresh succeeds
- **THEN** user sees protected app content directly
- **AND** no auth screen is shown

### Requirement: Email Entry Screen

The `/(auth)/index` screen SHALL show:

- Email input field
- "Continue" button to send OTP
- "Use a passkey" secondary action
- Error banner area for validation errors

#### Scenario: User submits email

- **WHEN** user enters email and taps "Continue"
- **AND** email is valid format
- **AND** OTP send request succeeds
- **THEN** screen transitions to `/(auth)/verify`
- **AND** email is pre-filled in next screen

#### Scenario: User submits invalid email

- **WHEN** user enters invalid email (not a valid email format)
- **AND** taps "Continue"
- **THEN** error banner shows "Please enter a valid email"
- **AND** user stays on same screen

#### Scenario: User taps passkey

- **WHEN** user taps "Use a passkey"
- **THEN** passkey authentication is initiated
- **AND** if successful, user goes to protected content

### Requirement: OTP Verification Screen

The `/(auth)/verify` screen SHALL show:

- Masked email (e.g., "Code sent to a***@example.com")
- 6-digit OTP input (auto-advance between digits)
- "Verify" button
- "Resend code" with countdown timer
- "Use a different email" secondary action
- "Use a passkey instead" secondary action

#### Scenario: User enters valid OTP

- **WHEN** user enters 6-digit OTP
- **AND** verification succeeds
- **THEN** user transitions to signed-in state
- **AND** protected content is shown

#### Scenario: User enters invalid OTP

- **WHEN** user enters incorrect OTP
- **AND** verification fails
- **THEN** error shows "Invalid code. Please try again."
- **AND** user can re-enter code
- **AND** attempts are not auto-locked (let user retry)

#### Scenario: User requests resend

- **WHEN** user taps "Resend code"
- **AND** cooldown timer has expired (or is first request)
- **THEN** new OTP is sent
- **AND** success message shows "Code sent"

### Requirement: Non-Blocking Auth Presentation

Mobile auth MAY be presented as a bottom sheet or modal, but the route structure MUST exist:

- `/(auth)` route group wraps auth screens
- `/(app)` route group contains protected screens
- Auth state is preserved even when sheet is dismissed

#### Scenario: User dismisses auth sheet

- **WHEN** user swipes down on auth sheet
- **AND** session is still valid
- **THEN** sheet dismisses
- **AND** user sees protected content

#### Scenario: User dismisses auth sheet without valid session

- **WHEN** user swipes down on auth sheet
- **AND** session is not valid
- **THEN** sheet dismisses
- **AND** reappears on next protected route access
