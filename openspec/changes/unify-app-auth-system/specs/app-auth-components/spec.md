# app-auth-components Specification

## Purpose

Defines the shared auth component contract for web and mobile. These components ensure consistent UX across platforms.

## ADDED Requirements

### Requirement: Required Web Components

Web apps SHALL implement these components (in `packages/ui`):

- `AuthScaffold` - Outer wrapper with layout
- `EmailEntryForm` - Email input with send OTP action
- `OtpVerificationForm` - OTP code input with verify action
- `OtpCodeInput` - Individual 6-digit input with auto-advance
- `ResendCodeButton` - Resend with countdown timer
- `PasskeyButton` - Trigger passkey authentication
- `AuthErrorBanner` - Inline error display
- `AuthLoadingState` - Loading spinner/message
- `SessionExpiredDialog` - Modal for expired session
- `SignedOutGuard` - Route wrapper for protected routes

#### Scenario: Email entry renders correctly

- **WHEN** `EmailEntryForm` is rendered
- **THEN** email input field is shown
- **AND** "Continue" button is enabled when email is entered
- **AND** error messages display inline above form

#### Scenario: OTP input auto-advances

- **WHEN** user enters a digit in `OtpCodeInput`
- **THEN** focus automatically moves to next input
- **AND** on last digit, form is auto-submitted

### Requirement: Required Mobile Components

Mobile apps SHALL implement components with matching props:

- `AuthScreen` - Screen wrapper for auth flows
- `EmailEntry` - Email input with validation
- `OtpEntry` - OTP code entry
- `PasskeyTrigger` - Button/trigger for passkey
- `AuthError` - Error display
- `AuthLoading` - Loading state

#### Scenario: Mobile components match web props

- **WHEN** web and mobile both implement auth
- **THEN** component interfaces are similar enough that app wrappers can be thin
- **AND** both platforms handle loading, error, and success states identically

### Requirement: Component States

All auth components SHALL handle these states:

- `idle`: Default state, waiting for user input
- `loading`: Action in progress, disable inputs
- `success`: Action completed, transition to next step
- `error`: Action failed, show error message
- `disabled`: Input not available (e.g., email field after OTP sent)

#### Scenario: Button shows loading state

- **WHEN** form is submitting
- **THEN** button shows spinner or "Loading..."
- **AND** input fields are disabled
- **AND** user cannot double-submit

#### Scenario: Error displays inline

- **WHEN** form submission fails
- **THEN** error message shows in `AuthErrorBanner`
- **AND** form fields remain visible
- **AND** user can retry without page reload

### Requirement: Accessibility

All auth components SHALL be accessible:

- All inputs have associated labels
- Error messages are announced to screen readers
- Keyboard navigation works for all inputs
- Focus management is logical during step transitions

#### Scenario: Screen reader announces error

- **WHEN** error message appears
- **THEN** screen reader announces error message
- **AND** focus moves to error area

### Requirement: Passkey Integration

Components for passkey SHALL:

- `PasskeyButton`: Initiates WebAuthn authentication
- Show appropriate UI for passkey not available
- Handle passkey verification failures gracefully

#### Scenario: Passkey not available

- **WHEN** user taps passkey button
- **AND** WebAuthn is not supported
- **THEN** error shows "Passkeys not supported on this device"
- **AND** user can fall back to email OTP
