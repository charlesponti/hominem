## ADDED Requirements

### Requirement: User can sign up with email OTP
The system SHALL allow new users to create an account using email one-time password verification.

#### Scenario: Successful email OTP signup
- **WHEN** user enters their email address on the signup page and submits
- **THEN** system sends a one-time password to the provided email address
- **AND** system displays a verification code input page

#### Scenario: User enters valid OTP
- **WHEN** user enters the correct OTP received via email
- **THEN** system creates a new user account with the verified email
- **AND** system creates an authenticated session
- **AND** system redirects user to the application

#### Scenario: User enters invalid OTP
- **WHEN** user enters an incorrect OTP
- **THEN** system displays an error message indicating the code is invalid
- **AND** system allows the user to retry up to 5 times

#### Scenario: OTP expires
- **WHEN** the OTP validity period (15 minutes) expires before verification
- **THEN** system displays an error indicating the code expired
- **AND** system allows user to request a new OTP

### Requirement: User can add passkey after signup
The system SHALL allow authenticated users to register a passkey for faster future logins.

#### Scenario: User adds passkey successfully
- **WHEN** an authenticated user clicks "Enable FaceID/TouchID" 
- **AND** the browser prompts for biometric verification
- **AND** user successfully verifies their identity
- **THEN** system creates a passkey associated with the user's account
- **AND** system displays a success confirmation

#### Scenario: User skips passkey setup
- **WHEN** an authenticated user declines or closes the passkey setup prompt
- **THEN** system does not create a passkey
- **AND** user continues with email-based authentication
- **AND** system may re-prompt on future logins

#### Scenario: Passkey registration fails
- **WHEN** the user attempts to register a passkey but the process fails
- **THEN** system displays an error message
- **AND** user can retry the passkey registration later

### Requirement: User can sign in with passkey
The system SHALL allow users to authenticate using a previously registered passkey.

#### Scenario: User signs in with passkey
- **WHEN** user clicks "Sign in with FaceID/TouchID" 
- **AND** the browser prompts for biometric verification
- **AND** user successfully verifies their identity
- **THEN** system creates an authenticated session
- **AND** system redirects user to the application

#### Scenario: No passkeys found for user
- **WHEN** user attempts passkey sign-in but no passkeys are registered
- **THEN** system redirects to email OTP sign-in
- **AND** system displays a message indicating no passkey was found

### Requirement: User can sign in with email OTP
The system SHALL allow users to authenticate using email one-time password.

#### Scenario: User requests OTP for sign-in
- **WHEN** user enters their email on the sign-in page and requests OTP
- **THEN** system sends a one-time password to the provided email
- **AND** system displays a verification code input page

#### Scenario: User signs in with valid OTP
- **WHEN** user enters the correct OTP received via email
- **THEN** system creates an authenticated session
- **AND** system redirects user to the application

### Requirement: User can recover account via email
The system SHALL allow users to regain access to their account through email verification.

#### Scenario: User requests account recovery
- **WHEN** user clicks "Forgot password" or "Can't access your account"
- **AND** user enters their registered email address
- **THEN** system sends a recovery OTP to the user's email
- **AND** system displays a verification code input page

#### Scenario: User completes account recovery
- **WHEN** user enters the correct recovery OTP
- **AND** user sets a new passkey (optional but encouraged)
- **THEN** system restores access to the user's account
- **AND** system creates an authenticated session

## REMOVED Requirements

### Requirement: User can sign in with Apple
**Reason**: Replaced by passkey-based authentication which is more secure and works on localhost without redirects
**Migration**: Use email OTP signup or passkey authentication

### Requirement: User can link Apple account
**Reason**: Apple OAuth is no longer supported
**Migration**: Use passkey linking instead

### Requirement: Mock authentication for local development
**Reason**: Passkeys work on localhost - mock auth is no longer needed
**Migration**: Use real better-auth with passkeys for local development
