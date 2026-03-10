## ADDED Requirements

### Requirement: Notes SHALL provide an AI-first workspace surface
The Notes app SHALL provide a workspace surface that keeps the assistant visible while surfacing core productivity context together.

#### Scenario: User opens workspace
- **WHEN** a signed-in user navigates to the workspace route
- **THEN** the workspace shows the assistant alongside notes and relevant supporting panels

### Requirement: Workspace notes SHALL support compact capture and exploration
The workspace SHALL support fast note capture and dense note browsing without requiring a traditional full-form flow.

#### Scenario: User creates note from workspace
- **WHEN** a user creates a note from the workspace composer
- **THEN** the workflow minimizes required fields and preserves fast entry behavior

### Requirement: Workspace notes SHALL support AI-assisted actions
The workspace SHALL provide AI-assisted note actions that a user can review before applying.

#### Scenario: User requests AI note action
- **WHEN** a user runs an AI action on a note
- **THEN** the result is presented in a way that the user can inspect before persisting changes
