## ADDED Requirements

### Requirement: Mobile Expo builds use the generated Hakumi icon
The system SHALL use the generated Hakumi square app icon asset as the primary Expo icon for the mobile app.

#### Scenario: Expo config points to the updated icon asset
- **WHEN** a maintainer resolves the mobile Expo config
- **THEN** the configured icon path references the updated Hakumi app icon asset used by builds

### Requirement: Generated iOS icon assets remain available
The system SHALL retain the generated iOS icon master file and app icon set in the mobile assets tree for native release workflows.

#### Scenario: Native icon assets are present
- **WHEN** a maintainer inspects the mobile iOS asset directory
- **THEN** the generated 1024x1024 master icon and `AppIcon.appiconset` are present
