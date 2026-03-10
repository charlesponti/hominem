## MODIFIED Requirements

### Requirement: OpenSpec SHALL organize active work under inbox
The repository OpenSpec workflow SHALL treat `openspec/inbox` as the home for all non-archived changes, including active work, drafts, and paused items.

#### Scenario: Open change discovery uses inbox
- **WHEN** a user or tool lists available changes
- **THEN** the open changes are discovered from `openspec/inbox`
- **AND** the active change referenced by `openspec/ACTIVE_CHANGE.md` points to artifacts under `openspec/inbox`

### Requirement: OpenSpec SHALL publish completed truth under done
The repository OpenSpec workflow SHALL treat `openspec/done` as the completed-work home, with canonical specs under `openspec/done/specs` and human-readable completion records under `openspec/done/records`.

#### Scenario: Completed capability truth lives under done specs
- **WHEN** a completed capability spec is consulted
- **THEN** the canonical source of truth is `openspec/done/specs/<capability>/spec.md`

#### Scenario: Completed change history lives under done records
- **WHEN** a user wants the narrative summary of a completed change
- **THEN** the repository provides it under `openspec/done/records/YYYY-MM-DD-<change>.md`
- **AND** `openspec/done/README.md` indexes both canonical specs and completion records

### Requirement: OpenSpec SHALL preserve archive as trace-only history
The repository OpenSpec workflow SHALL treat `openspec/archive` as the traceability store for raw archived change folders, not as the canonical source of current truth.

#### Scenario: Archived change remains available for audit
- **WHEN** a completed change is archived
- **THEN** its raw change folder is preserved under `openspec/archive/YYYY-MM-DD-<change>`
- **AND** the synced final spec and completion record remain authoritative under `openspec/done`

### Requirement: Legacy OpenSpec paths SHALL remain available as compatibility shims
The repository SHALL preserve compatibility for legacy `openspec/changes`, `openspec/specs`, and `openspec/merged` paths so the current CLI and older workflow helpers continue to function during the transition.

#### Scenario: Legacy CLI path still resolves after layout migration
- **WHEN** existing tooling reads `openspec/changes`, `openspec/specs`, or `openspec/merged`
- **THEN** the repository resolves those paths to the new `inbox`, `done/specs`, and `done/records` locations without losing data
