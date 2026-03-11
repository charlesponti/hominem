## Requirements

### Requirement: Chat surfaces SHALL use shared AI Elements primitives
Supported chat surfaces SHALL rely on shared AI Elements-based primitives instead of duplicating equivalent custom UI implementations.

#### Scenario: Developer updates chat UI
- **WHEN** a developer works on a supported chat surface
- **THEN** the surface uses the shared AI Elements-based components for core chat interactions

### Requirement: AI Elements adoption SHALL preserve core chat workflows
The migration to AI Elements SHALL preserve the core chat workflows already supported by the product.

#### Scenario: User sends rich chat input
- **WHEN** a user interacts with chat input, messages, or attachments on a migrated surface
- **THEN** the workflow still supports the required chat behavior after the UI migration

### Requirement: AI Elements adoption SHALL be validated across shared and app surfaces
The migration SHALL include verification that the shared components and app integrations still function correctly.

#### Scenario: Team validates migrated chat UI
- **WHEN** the AI Elements migration is reviewed
- **THEN** the shared component layer and integrated chat surfaces pass the expected checks
