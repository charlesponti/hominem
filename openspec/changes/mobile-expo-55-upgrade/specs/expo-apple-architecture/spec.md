## ADDED Requirements

### Requirement: Feature-sliced app architecture

The mobile app SHALL be organized into explicit feature-sliced layers: app-shell, feature domain modules, shared UI/platform primitives, and infrastructure services.

#### Scenario: Layer boundaries are implemented
- **WHEN** route and non-route code is organized
- **AND** each feature keeps orchestration, state, and presentation in one domain folder
- **THEN** no feature logic is directly embedded inside routing config files
- **AND** shared utilities are limited to `shared` and `infra` modules

### Requirement: App shell and provider ownership

The app-shell SHALL own global concerns such as error boundaries, theme, authentication routing guards, and root query and RPC providers.

#### Scenario: Provider graph is centralized
- **WHEN** the app starts
- **AND** `app/_layout.tsx` is evaluated
- **THEN** global providers are installed exactly once in a stable order
- **AND** feature screens do not re-provide root-level services

### Requirement: Feature migration without behavior breakage

Each existing feature area SHALL migrate into feature modules while preserving behavior and route surfaces.

#### Scenario: Feature slice extraction
- **WHEN** a feature (auth, chat, focus, or account) is moved into `src/feature`-style structure
- **AND** route entrypoints are updated to the new module
- **THEN** existing navigation into that feature remains functional
- **AND** auth and onboarding behavior stays unchanged for that feature

### Requirement: Data boundary separation

The app SHALL separate feature data orchestration from UI rendering for new architecture consistency.

#### Scenario: Data and UI boundaries
- **WHEN** a feature requests server data
- **AND** query logic exists in feature-local data/hooks modules
- **AND** UI components render from those data contracts only
- **THEN** components do not directly import transport implementation details

### Requirement: Variant-aware architecture integrity

The new structure SHALL not alter variant identity, OTA channel use, or variant startup behavior.

#### Scenario: Variant integrity after refactor
- **WHEN** variant build is executed
- **AND** app variant identifiers are resolved in config
- **THEN** startup and routing behavior remain variant-specific
- **AND** no variant uses an incorrect app identifier or profile
