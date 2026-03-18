## ADDED Requirements

### Requirement: EAS Update Groups configured for preview channel
The `eas.json` SHALL define update group configuration enabling percentage-based OTA rollout on the preview channel.

#### Scenario: Rollout starts at 10%
- **WHEN** a new OTA update is published to the preview channel
- **THEN** it is initially delivered to 10% of devices on that channel

#### Scenario: Rollout can be promoted
- **WHEN** `bun run build:update:preview:rollout:50` is executed
- **THEN** the active update group is promoted to 50% of devices

#### Scenario: Rollout can be completed
- **WHEN** `bun run build:update:preview:rollout:100` is executed
- **THEN** the update is delivered to 100% of devices

### Requirement: Rollout scripts in package.json
The mobile `package.json` SHALL include scripts for managing each rollout stage.

#### Scenario: Stage scripts are available
- **WHEN** running `bun run build:update:preview:rollout:50`
- **THEN** the EAS CLI promotes the active preview rollout to 50%

#### Scenario: Rollback is available
- **WHEN** running `bun run build:update:preview:rollback`
- **THEN** the active rollout is rolled back and the previous update is restored for affected devices
