## Context

The repo recently introduced a custom OpenSpec layout centered on `openspec/inbox`, `openspec/done`, and `openspec/archive`, with `openspec/changes`, `openspec/specs`, and `openspec/merged` recreated as compatibility links. That layout technically preserved some CLI behavior, but it made the repository harder to reason about because the visible OpenSpec conventions no longer matched the standard mental model used by OpenSpec documentation and tooling.

This follow-up change restores the default OpenSpec structure while preserving raw archived change folders under `openspec/archive`. The main complexity is migrating files back without losing the newly created canonical `openspec-workflow` spec or the archive and merged record produced during the previous change.

## Goals / Non-Goals

**Goals:**
- Restore `openspec/changes` as the real home for open changes.
- Restore `openspec/specs` as the real canonical spec tree.
- Restore `openspec/merged` as the real merged-record tree.
- Remove `openspec/inbox` and `openspec/done` from live workflow guidance.
- Keep `openspec/archive` as the trace-only location for raw archived change folders.

**Non-Goals:**
- Changing upstream OpenSpec CLI behavior.
- Rewriting historical archived content beyond path references needed for live guidance.
- Altering the archive naming convention introduced in the repo.

## Decisions

### Make legacy OpenSpec paths authoritative again

`openspec/changes`, `openspec/specs`, and `openspec/merged` will become real directories again instead of symlinks. This matches standard OpenSpec usage and removes a layer of indirection for both people and tooling.

Alternative considered: keep the current layout and improve docs only. Rejected because the user-facing confusion comes from the filesystem model itself, not just the wording.

### Preserve archive as a repo-specific extension

`openspec/archive` will remain in place for raw archived change folders. It is not part of the default OpenSpec trio, but it does not conflict with it and provides useful audit history.

Alternative considered: move raw archived change folders into `openspec/merged`. Rejected because merged records and raw change folders serve different purposes.

### Move content instead of layering more shims

The implementation will relocate the actual directories and files back to the standard paths, then remove the temporary custom directories. This keeps the resulting structure simple and avoids growing a mesh of symlinks.

Alternative considered: add reverse symlinks from `changes/specs/merged` into `inbox/done`. Rejected because it would perpetuate the same confusion.

## Risks / Trade-offs

- Path regressions in docs or skills -> Search live repo guidance and update all workflow-facing references in the same change.
- Archive and merged record drift -> Move existing files carefully and verify the archived `openspec-refactor` artifacts still resolve after the relocation.
- Dirty worktree interactions -> Avoid destructive cleanup and only change paths directly tied to the OpenSpec layout.

## Migration Plan

1. Update `openspec/ACTIVE_CHANGE.md` to activate this change under `openspec/changes`.
2. Move canonical specs from `openspec/done/specs` back to `openspec/specs`.
3. Move merged records and supporting files from `openspec/done/records` back to `openspec/merged`.
4. Move remaining open changes from `openspec/inbox` back to `openspec/changes`.
5. Remove the temporary `openspec/inbox` and `openspec/done` directories and any associated compatibility links.
6. Update live docs and OpenSpec artifacts to reference the restored standard paths.
7. Verify `openspec list --json` and the resulting directory structure.

## Open Questions

None.
