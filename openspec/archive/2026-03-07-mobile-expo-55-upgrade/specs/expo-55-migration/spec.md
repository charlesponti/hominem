## ADDED Requirements

### Requirement: Upgrade dependencies through Expo-managed versioning

The mobile app SHALL align its dependency set to Expo SDK 55 using Expo-managed dependency resolution so all SDK modules remain compatible.

#### Scenario: Expo-managed dependency updates
- **WHEN** upgrade commands execute using Expo tooling
- **AND** lockfiles are regenerated
- **THEN** `expo` resolves to an SDK 55 compatible line
- **AND** `react` resolves to the matching Expo-supported React 19 line
- **AND** `react-native` resolves to the matching Expo 55 React Native version
- **AND** `expo-router` resolves to the SDK 55-compatible version

### Requirement: Animation runtime is updated and validated

The app SHALL run animation logic on a reanimated/worklets stack compatible with React Native 0.83.

#### Scenario: Animation stack update
- **WHEN** dependency updates complete
- **AND** `react-native-reanimated` and `react-native-worklets` are updated
- **THEN** the app bundle builds without native linking errors
- **AND** animated screens used by core flows render without runtime errors

### Requirement: React Compiler enablement with rollback

The app SHALL enable React Compiler in app.config while preserving a quick rollback path.

#### Scenario: Controlled React Compiler rollout
- **WHEN** `experiments.reactCompiler` is enabled in app.config.ts
- **AND** app builds succeed in dev profile
- **THEN** route rendering and performance-sensitive screens remain stable
- **AND** a documented command exists to disable it for emergency rollback

### Requirement: Typed routes remain stable

Typed route support SHALL remain functional after the upgrade.

#### Scenario: Typed route compatibility
- **WHEN** TypeScript compiles the project
- **AND** route files are included in Expo type generation
- **THEN** no route type errors occur
- **AND** navigation APIs remain typed across protected and public routes

### Requirement: Migration gates pass

The app SHALL pass a minimum quality gate after dependency and configuration changes.

#### Scenario: Automated validation gate
- **WHEN** post-upgrade checks are run
- **AND** `bun run check` executes
- **AND** `bun run test` executes
- **AND** `npx expo-doctor` executes
- **THEN** each command exits with status 0
- **AND** high-impact regressions are addressed before release

### Requirement: Multi-variant behavior is preserved

Existing variants (dev/e2e/preview/production) SHALL preserve their identity and update channels.

#### Scenario: Variant matrix integrity
- **WHEN** prebuild or build commands run for each variant
- **THEN** iOS bundle IDs and Android application IDs match variant configuration
- **AND** OTA channel settings remain scoped to the selected variant
- **AND** build scripts continue to use expected profiles

### Requirement: Native folder compatibility remains intentional

The committed native projects SHALL reflect only intended changes after upgrade steps.

#### Scenario: Native project reviewability
- **WHEN** a prebuild or regenerate step executes after upgrade
- **AND** diffs are reviewed before merge
- **THEN** no unintended native deletions are introduced
- **AND** builds for all variants still succeed
