## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: OpenSpec SHALL preserve archive as trace-only history
**Reason**: Completed changes now finalize into canonical specs only, so retaining raw archived change folders is no longer part of the supported workflow.
**Migration**: Delete `openspec/archive` and update any remaining live references to use `openspec/specs` as the completed source of truth.

### Requirement: OpenSpec SHALL publish completed truth under specs and merged
**Reason**: Keeping both merged records and capability specs has created drift, so completed OpenSpec truth now lives only in canonical specs.
**Migration**: Delete `openspec/merged` and update any remaining live references to use `openspec/specs` instead of merged change-history docs.
