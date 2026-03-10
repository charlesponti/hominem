## Why

The repo currently spreads completed OpenSpec history across change-oriented writeups and capability specs, but those layers are not being kept in sync. Keeping both `openspec/merged` and `openspec/specs` has added more ambiguity than clarity, so the workflow should collapse to a single completed source of truth.

## What Changes

- Remove `openspec/archive` from the live OpenSpec workflow and stop retaining raw completed change folders after merge.
- Remove `openspec/merged` from the live OpenSpec workflow and stop maintaining change-history records as a second completed source.
- Treat `openspec/specs` as the only canonical completed source after a change is finished.
- Remove the legacy top-level `specs/` planning workflow so OpenSpec is the only active spec system in the repo.
- Migrate the remaining `docs/plans` planning documents into OpenSpec changes so `docs/plans` is no longer a parallel planning system.
- Consolidate overlapping authentication documentation under `docs` so one current auth reference remains.
- Consolidate the `docs/docker/*` bundle into one canonical `docker.instructions.md` file aligned with the repo's actual Docker layout.
- Consolidate overlapping setup and deployment docs under `docs` into canonical root-level instructions that match the current scripts, Docker setup, and Railway manifests.
- Eliminate the root `docs/` folder by moving any surviving repo-wide guidance into `.github/instructions`, keeping service-local docs next to their services, and deleting unowned stale analysis files.
- Update workflow guidance, indexes, and close-out expectations so completed changes are finalized into `specs` only.
- Delete the existing `openspec/merged` content, stale top-level `specs/` artifacts, and `docs/plans` planning docs as part of the cleanup.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `openspec-workflow`: Completed OpenSpec history no longer preserves raw archived change folders or merged change records and instead finalizes work only into `openspec/specs`.

## Impact

- Affected code: `openspec/` workflow docs, change lifecycle docs, canonical docs under `docs`, `docs/plans`, and any scripts or skills that reference archive or merged-record retention.
- Affected systems: OpenSpec authoring, close-out hygiene, repo onboarding guidance, the legacy top-level spec workflow, and the legacy docs-based planning workflow.
- Affected data: existing `openspec/archive`, `openspec/merged`, stale top-level `specs/`, and `docs/plans` contents will be removed from the old workflow model after migration.
