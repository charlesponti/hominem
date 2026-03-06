## ADDED Requirements

### Requirement: Apple design token layer

The app SHALL provide a shared token layer for spacing, typography, color semantics, radii, and motion that is reused by feature UI.

#### Scenario: Shared tokens drive style decisions
- **WHEN** shared UI components are rendered
- **AND** semantic token values are used for spacing and color
- **THEN** design values remain consistent across features
- **AND** hardcoded visual values are limited to temporary migration exceptions

### Requirement: Apple-aligned primitive components

The app SHALL expose reusable primitives for bars, cards, rows, empty states, and action controls.

#### Scenario: Primitive adoption
- **WHEN** a feature is migrated to new architecture
- **AND** shared primitives are available for that feature
- **THEN** each migrated screen should use shared primitives over one-off bespoke controls
- **AND** primitives must support dark mode and reduced contrast requirements

### Requirement: Platform-native iconography and motion

The app SHALL prioritize native-like icons and animation behavior through Expo-native mechanisms and symbol primitives where appropriate.

#### Scenario: Symbol and motion standards
- **WHEN** screen-level iconography is updated
- **AND** symbol primitives replace ad-hoc icon implementations
- **THEN** icon behavior remains consistent across iOS, Android, and web entry points
- **AND** motion remains subtle and non-blocking

### Requirement: Accessibility-first UI defaults

The app SHALL apply baseline accessibility defaults in migrated areas: touch target minimums, label clarity, and reduced-motion safe animations.

#### Scenario: Accessibility checks in migrated features
- **WHEN** a migrated feature is rendered
- **AND** it exposes interactive elements
- **THEN** each actionable element meets touch target rules
- **AND** labels and hints are exposed for screen readers

### Requirement: Migration-ready visual parity

The re-architected design system SHALL include a migration checklist so new visuals are validated without changing user tasks.

#### Scenario: Visual parity gate
- **WHEN** a screen is migrated to design-system components
- **AND** smoke scenarios for the screen are run
- **THEN** no regression is introduced in navigation and key interactions
- **AND** visual hierarchy, spacing, and typography remain understandable
