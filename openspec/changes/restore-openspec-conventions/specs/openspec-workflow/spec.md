## MODIFIED Requirements

### Requirement: OpenSpec SHALL organize active work under changes
The repository OpenSpec workflow SHALL treat `openspec/changes` as the home for all non-archived changes, including active work, drafts, and paused items.

#### Scenario: Open change discovery uses changes
- **WHEN** a user or tool lists available changes
- **THEN** the open changes are discovered from `openspec/changes`
- **AND** the active change referenced by `openspec/ACTIVE_CHANGE.md` points to artifacts under `openspec/changes`

### Requirement: OpenSpec SHALL publish completed truth under specs and merged
The repository OpenSpec workflow SHALL treat `openspec/specs` as the canonical completed spec tree and `openspec/merged` as the human-readable completed change history.

#### Scenario: Completed capability truth lives under specs
- **WHEN** a completed capability spec is consulted
- **THEN** the canonical source of truth is `openspec/specs/<capability>/spec.md`

#### Scenario: Completed change history lives under merged
- **WHEN** a user wants the narrative summary of a completed change
- **THEN** the repository provides it under `openspec/merged/YYYY-MM-DD-<change>.md`

### Requirement: OpenSpec SHALL preserve archive as trace-only history
The repository OpenSpec workflow SHALL treat `openspec/archive` as the traceability store for raw archived change folders, not as the canonical source of current truth.

#### Scenario: Archived change remains available for audit
- **WHEN** a completed change is archived
- **THEN** its raw change folder is preserved under `openspec/archive/YYYY-MM-DD-<change>`
- **AND** the synced final spec and completion record remain authoritative under `openspec/specs` and `openspec/merged`

### Requirement: OpenSpec SHALL avoid custom path indirection in live workflow guidance
The repository SHALL describe and operate its live OpenSpec workflow directly in terms of `openspec/changes`, `openspec/specs`, and `openspec/merged` rather than repo-specific aliases such as `inbox` or `done`.

#### Scenario: Workflow docs reference standard OpenSpec paths
- **WHEN** a user or agent reads live workflow guidance in the repo
- **THEN** the guidance references `openspec/changes`, `openspec/specs`, and `openspec/merged` as the primary workflow paths
- **AND** the guidance does not require understanding a separate custom OpenSpec directory model
