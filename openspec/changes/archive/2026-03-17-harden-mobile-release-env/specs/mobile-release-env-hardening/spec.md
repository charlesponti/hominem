## ADDED Requirements

### Requirement: Local env files are limited to non-release variants
The system SHALL allow only `dev` and `e2e` mobile variants to source local `.env.*.local` files.

#### Scenario: Release variant attempts local env sourcing
- **WHEN** a maintainer runs the variant launcher for `preview` or `production`
- **THEN** the command fails instead of sourcing a local env file

### Requirement: Release variants validate EAS-managed env before execution
The system SHALL verify required release env values from the corresponding EAS environment before preview or production build and OTA commands run.

#### Scenario: Preview EAS env is missing required values
- **WHEN** a maintainer starts a preview release command and the EAS `preview` environment is missing `EXPO_PUBLIC_API_BASE_URL`
- **THEN** the command fails before build or OTA execution begins

### Requirement: Release env policy is documented
The system SHALL document that preview and production use EAS-managed environments instead of local env files.

#### Scenario: Maintainer reviews mobile env setup
- **WHEN** a maintainer reads the mobile README
- **THEN** the release env matrix clearly distinguishes local-only and EAS-managed variants
