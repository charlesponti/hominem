## Why

The repo-specific `inbox` and `done` OpenSpec layout is making normal OpenSpec concepts harder to follow. We should return to the standard `changes`, `specs`, and `merged` conventions so humans and tooling see the same structure.

## What Changes

- Move open changes back under `openspec/changes`.
- Move canonical completed specs back under `openspec/specs`.
- Move merged completion records back under `openspec/merged`.
- Remove the `openspec/inbox` and `openspec/done` indirection from live workflow docs and compatibility links.
- Update archive and active-change guidance so future work follows the default OpenSpec model.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `openspec-workflow`: The repository OpenSpec workflow requirements will switch from the custom `inbox`/`done` layout back to the standard `changes`/`specs`/`merged` conventions.

## Impact

- Affected code: `openspec` directory layout, active-change guidance, done/merged indexes, and agent workflow docs.
- Affected systems: local `openspec` CLI usage, archive flow, merge-doc flow, and repo instructions that reference OpenSpec paths.
- Risk areas: stale path references, broken symlinks, and archive records that reference the temporary custom layout.
