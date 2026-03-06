# app-auth-lifecycle Specification

## Purpose

Defines the canonical auth state machine and lifecycle shared by all first-party apps (mobile and web). This ensures consistent auth behavior across platforms and prevents drift.

## ADDED Requirements

### Requirement: Canonical Auth State Machine

All first-party apps SHALL use the same auth state machine with these exact states:

- `booting`: App initializing, checking stored credentials
- `signed_out`: No valid session, showing auth entry
- `requesting_otp`: Sending OTP to email
- `otp_requested`: OTP sent, showing code entry
- `verifying_otp`: Verifying OTP code
- `authenticating_passkey`: Passkey authentication in progress
- `refreshing_session`: Refreshing access token
- `signed_in`: Valid session, protected content accessible
- `signing_out`: Cleaning up session
- `degraded`: Auth error, user can retry

#### Scenario: Mobile app boots with valid stored credentials

- **WHEN** mobile app launches with stored refresh token
- **AND** access token is valid or can be refreshed
- **THEN** app transitions to `signed_in` state
- **AND** user sees protected content immediately

#### Scenario: Mobile app boots without credentials

- **WHEN** mobile app launches with no stored refresh token
- **THEN** app transitions to `signed_out` state
- **AND** user sees auth entry screen

#### Scenario: Web app boots with valid cookie

- **WHEN** web app loads with valid refresh token cookie
- **AND** access token can be obtained (from memory or refresh)
- **THEN** app transitions to `signed_in` state
- **AND** user sees protected content

#### Scenario: Web app boots without credentials

- **WHEN** web app loads with no valid refresh token cookie
- **THEN** app redirects to `/auth`
- **AND** user sees auth entry screen

#### Scenario: User signs out from any state

- **WHEN** user initiates sign out from any state
- **THEN** app transitions to `signing_out` state
- **AND** clears stored credentials
- **AND** transitions to `signed_out` state

#### Scenario: Auth error during protected operation

- **WHEN** a protected API call returns 401 during signed_in state
- **AND** token refresh is attempted and fails
- **THEN** app transitions to `degraded` state
- **AND** shows error with retry option

### Requirement: State Transition Rules

The auth state machine SHALL enforce these transition rules:

- From `booting`: Can only go to `signed_out` or `signed_in`
- From `signed_out`: Can only go to `requesting_otp` or `authenticating_passkey`
- From `requesting_otp`: Can only go to `otp_requested` or `degraded`
- From `otp_requested`: Can only go to `verifying_otp` or `signed_out` (user cancels)
- From `verifying_otp`: Can only go to `signed_in` or `degraded` or `signed_out` (invalid code)
- From `authenticating_passkey`: Can only go to `signed_in` or `degraded`
- From `refreshing_session`: Can only go to `signed_in` or `signed_out`
- From `signed_in`: Can only go to `signing_out` or `degraded`
- From `signing_out`: Can only go to `signed_out`
- From `degraded`: Can only go to `signed_out` (retry success) or stays in `degraded`

#### Scenario: Invalid OTP code entry

- **WHEN** user enters incorrect OTP code
- **AND** verification fails
- **THEN** state stays in `otp_requested` (not `degraded`)
- **AND** error message shows "Invalid code. Please try again."

#### Scenario: Network error during OTP verification

- **WHEN** network request fails during OTP verification
- **THEN** state transitions to `degraded`
- **AND** error message shows "Connection error. Please check your internet."

### Requirement: Loading State Behavior

The auth state machine SHALL handle loading states explicitly:

- `booting`: Loading indicator shown only if check takes > 200ms
- `requesting_otp`: Shows "Sending code..." with spinner
- `verifying_otp`: Shows "Verifying..." with spinner
- `authenticating_passkey`: Shows "Signing in with passkey..." with spinner
- `refreshing_session`: Silent background refresh, no UI blocking
- `signing_out`: Shows "Signing out..." if takes > 200ms

#### Scenario: Fast boot with valid credentials

- **WHEN** app boots and credentials are valid
- **AND** boot check completes in < 200ms
- **THEN** user sees signed-in content directly (no loading flash)

#### Scenario: Slow network during OTP request

- **WHEN** user submits email and network is slow
- **AND** request takes > 1 second
- **THEN** loading state is visible to user
- **AND** button shows loading spinner
