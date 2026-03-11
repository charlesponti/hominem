## ADDED Requirements

### Requirement: Mobile auth SHALL pass final verification gates before closeout
The auth platform SHALL complete its remaining mobile verification gates before the work is considered operationally ready.

#### Scenario: Final mobile verification runs
- **WHEN** the mobile auth closeout work is executed
- **THEN** the required layered auth verification flows are run and reviewed, including `jest-expo` plus React Native Testing Library coverage, `expo-router/testing-library` route checks, retained native-critical Detox checks, and a personal-device smoke checklist for hardware-specific validation

### Requirement: Mobile auth verification SHALL avoid paid Expo workflow dependencies
The auth platform SHALL use a verification path that does not require paid Expo workflow features for mobile auth readiness.

#### Scenario: Team selects mobile end-to-end coverage
- **WHEN** the team defines or updates auth end-to-end verification
- **THEN** the repo-standard path uses local JS test harnesses, retained Detox simulator coverage, and personal-device smoke validation instead of paid Expo workflow features

### Requirement: Mobile runtime configuration SHALL generate deterministic variant-specific native settings
The mobile runtime SHALL generate native projects that match the intended Expo / React Native runtime model for each app variant.

#### Scenario: Development build is generated
- **WHEN** `APP_VARIANT=dev` is used for native generation
- **THEN** the generated iOS project includes `expo-dev-client` support, local networking support, Metro-driven bundle loading, and updates disabled for that runtime

#### Scenario: E2E build is generated
- **WHEN** `APP_VARIANT=e2e` is used for native generation
- **THEN** the generated iOS project excludes `expo-dev-client`, remains deterministic for Detox, and disables updates for that runtime

#### Scenario: Variant switches between dev and e2e
- **WHEN** the team regenerates native iOS artifacts for a different variant
- **THEN** the repo-native prebuild path replaces stale native settings so the Podfile, Expo plist, app identity, and generated project name match the requested variant

### Requirement: Auth operations SHALL document emergency controls
The auth platform SHALL document and verify the emergency controls needed for production response.

#### Scenario: Operator reviews auth emergency controls
- **WHEN** an operator reviews the auth operational readiness materials
- **THEN** the incident-response and emergency auth controls are documented and usable

### Requirement: Auth closeout SHALL end with explicit readiness status
The auth/mobile closeout SHALL conclude with an explicit readiness decision.

#### Scenario: Team evaluates auth readiness
- **WHEN** the remaining hardening and verification work is complete
- **THEN** the final readiness status is recorded as complete or explicitly de-scoped with rationale

### Requirement: Auth closeout SHALL maintain a clean repo safety signal
The auth/mobile closeout SHALL leave the standard repo safety check free of lint warnings that were surfaced during the closeout.

#### Scenario: Team runs the standard safety check
- **WHEN** `bun run check` is executed during auth/mobile closeout
- **THEN** stale unused imports, unused parameters, and dead local helpers uncovered by that run are removed so the check output remains actionable
