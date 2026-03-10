## Context

The repo currently treats `openspec/changes` as in-flight work, `openspec/specs` as current canonical specs, and `openspec/merged` as completion history. The distinction between `merged` and archived change folders is not obvious in day-to-day use, and the current top-level names do not map cleanly to the lifecycle users actually think about.

The repository also depends on the external `openspec` CLI, which appears to assume the legacy `changes`, `specs`, and `merged` paths. That means the repo can adopt a cleaner primary layout, but it must preserve compatibility for the CLI and existing automations.

## Goals / Non-Goals

**Goals:**
- Make the primary OpenSpec layout read as `inbox`, `done`, and `archive`.
- Keep `done/specs` as the canonical final truth and `done/records` as readable completion history.
- Preserve `openspec` CLI functionality in the repo through compatibility shims.
- Update live instructions so humans and agents are guided to the new layout first.

**Non-Goals:**
- Modify the upstream `openspec` CLI binary.
- Rewrite historical archived content to remove every old path mention.
- Change schema semantics or artifact formats beyond path and workflow guidance.

## Decisions

### Use compatibility symlinks for legacy CLI paths

The repo will move real content to `openspec/inbox`, `openspec/done`, and `openspec/archive`, then recreate `openspec/changes`, `openspec/specs`, and `openspec/merged` as compatibility symlinks into the new structure. This keeps the cleaner top-level layout while preserving the current CLI contract.

### Keep `done` split into `specs` and `records`

`done/specs` remains the canonical completed spec tree, while `done/records` stores human-readable completion records and the merge-doc template. `done/README.md` becomes the top-level index for both.

### Treat archive as non-authoritative

Archived change folders remain for traceability only. Once a completed change is synced into `done/specs` and `done/records`, the archive copy is historical and should not be the place agents or humans use to find current truth.

## Risks / Trade-offs

- Compatibility symlinks add a small amount of filesystem indirection.
- Some historical docs will continue to mention old paths, which is acceptable as long as live workflow docs are updated.
- Future tooling that bypasses the filesystem and hardcodes path assumptions differently may still need follow-up changes.

## Migration Plan

1. Create the new top-level directories and seed `done/README.md`.
2. Move open changes to `openspec/inbox`.
3. Move archived changes to `openspec/archive`.
4. Move canonical specs to `openspec/done/specs`.
5. Move merged records to `openspec/done/records`.
6. Recreate `changes`, `specs`, and `merged` as compatibility symlinks.
7. Update live docs, prompts, and skills to describe the new model.
8. Verify `openspec list --json` and `openspec list --specs --json` still work.

## Rollout Follow-Ups

- New workflow docs should prefer `inbox`, `done`, and `archive` in human-facing text.
- Compatibility symlinks can remain until the upstream CLI natively supports custom path roots or the repo chooses to remove legacy support.
