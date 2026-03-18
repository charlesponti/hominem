## ADDED Requirements

### Requirement: Mobile Expo identity remains consistent
The system SHALL expose the same Expo owner, project ID, and project slug across the mobile app runtime config and any checked-in operational reference files used for release workflows.

#### Scenario: Release metadata is aligned
- **WHEN** a maintainer inspects the mobile Expo configuration
- **THEN** the owner, project ID, and slug match across runtime and reference sources

### Requirement: Mobile Expo config is resolvable in the monorepo
The system SHALL provide a supported command path that resolves the mobile Expo app config successfully from the monorepo so release workflows do not depend on EAS fallback parsing.

#### Scenario: Config command succeeds
- **WHEN** a maintainer runs the supported Expo config verification command from the monorepo
- **THEN** Expo returns the mobile app config without an npm override or dependency-resolution failure

### Requirement: Release verification catches config drift before deploy
The system SHALL validate Expo config resolution and release-critical identity values before mobile release commands proceed.

#### Scenario: Drift blocks release validation
- **WHEN** Expo config resolution fails or the owner/project metadata diverges
- **THEN** the verification step fails before OTA publish or production build submission continues
