## ADDED Requirements

### Requirement: Production release workflow exists
A GitHub Actions workflow SHALL exist at `.github/workflows/mobile-production-release.yml` that builds the production iOS binary and submits it to TestFlight.

#### Scenario: Workflow triggered manually
- **WHEN** a user triggers `workflow_dispatch` on the `mobile-production-release` workflow
- **THEN** the workflow runs all pre-release gates and, if passing, builds and submits to TestFlight

### Requirement: Pre-release gates run before build
The workflow SHALL run typecheck, unit tests, Expo config verification, and EAS env verification before invoking `eas build`.

#### Scenario: Typecheck failure blocks build
- **WHEN** TypeScript type errors are present
- **THEN** the workflow fails before `eas build` is invoked

#### Scenario: All gates pass
- **WHEN** all pre-release gates pass
- **THEN** `eas build --profile production --platform ios` is invoked

### Requirement: TestFlight submission follows successful build
The workflow SHALL invoke `eas submit --profile production` after a successful `eas build`.

#### Scenario: Build succeeds and submit runs
- **WHEN** `eas build` completes successfully
- **THEN** `eas submit --profile production --non-interactive` is invoked automatically

### Requirement: Missing secrets fail fast
The workflow SHALL verify required secrets (`EXPO_TOKEN`, `EXPO_APPLE_ID`, `EXPO_ASC_APP_ID`) are present before proceeding.

#### Scenario: Missing EXPO_APPLE_ID
- **WHEN** the `EXPO_APPLE_ID` secret is not set
- **THEN** the workflow fails immediately with a descriptive error message
