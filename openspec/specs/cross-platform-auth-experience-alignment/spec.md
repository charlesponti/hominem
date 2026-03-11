# cross-platform-auth-experience-alignment Specification

## Purpose
Ensure first-party web and mobile apps deliver the same auth experience, styling, and post-auth behavior for each product.

## Requirements

### Requirement: Web and mobile auth use one canonical experience contract
All first-party apps MUST implement authentication through a shared auth UX contract that defines the same user-facing states and transitions on web and mobile.

#### Scenario: Email sign-in begins
- **WHEN** a user starts sign-in on web or mobile
- **THEN** both platforms present the same email entry state and action hierarchy

#### Scenario: OTP verification begins
- **WHEN** the user proceeds to verification
- **THEN** both platforms present the same verification state, copy, and error handling behavior

#### Scenario: Passkey sign-in fails
- **WHEN** passkey authentication fails on either platform
- **THEN** both platforms surface equivalent recovery messaging and remain in equivalent auth states

### Requirement: Auth presentation is visually aligned across platforms
Shared auth surfaces MUST use common design primitives so visual hierarchy, spacing, and messaging remain aligned across web and mobile.

#### Scenario: Primary auth surface renders
- **WHEN** the auth entry screen renders for a given app
- **THEN** web and mobile use the same title, descriptive copy, field order, and primary/secondary action hierarchy

#### Scenario: Error state renders
- **WHEN** an auth error is shown
- **THEN** web and mobile render equivalent error content and placement

### Requirement: Per-app auth destination policy is shared across platforms
Each app’s post-auth destination and allowed destination policy MUST be defined once and applied consistently on web and mobile.

#### Scenario: Notes user signs in
- **WHEN** a Notes user completes authentication on web or mobile
- **THEN** both platforms land on the same canonical signed-in destination for Notes

#### Scenario: Rocco user provides a next destination
- **WHEN** a Rocco user signs in with a valid in-app next destination
- **THEN** both platforms resolve and honor the same destination policy
