## MODIFIED Requirements

### Requirement: OpenSpec SHALL organize active work under changes
The repository OpenSpec workflow SHALL treat `openspec/changes` as the home for all non-archived changes, including active work, drafts, and paused items.

#### Scenario: Open change discovery uses changes
- **WHEN** a user or tool lists available changes
- **THEN** the open changes are discovered from `openspec/changes`
- **AND** the active change referenced by `openspec/ACTIVE_CHANGE.md` either points to artifacts under `openspec/changes` or is explicitly unset as `active_change: none`

### Requirement: OpenSpec SHALL publish completed truth under specs only
The repository OpenSpec workflow SHALL treat `openspec/specs` as the only canonical completed OpenSpec tree.

#### Scenario: Completed capability truth lives under specs
- **WHEN** a completed capability spec is consulted
- **THEN** the canonical source of truth is `openspec/specs/<capability>/spec.md`
- **AND** no second completed OpenSpec history directory is required

### Requirement: OpenSpec SHALL avoid custom path indirection in live workflow guidance
The repository SHALL describe and operate its live OpenSpec workflow directly in terms of `openspec/changes` and `openspec/specs` rather than repo-specific aliases or extra completed-history directories.

#### Scenario: Workflow docs reference standard OpenSpec paths
- **WHEN** a user or agent reads live workflow guidance in the repo
- **THEN** the guidance references `openspec/changes` and `openspec/specs` as the primary workflow paths
- **AND** the guidance does not require understanding a separate custom OpenSpec directory model
- **AND** the guidance does not instruct the user to keep a separate raw archive tree or merged change-history tree for completed changes
