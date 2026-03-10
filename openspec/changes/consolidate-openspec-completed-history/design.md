## Context

The repo currently has a split completed-work model: canonical capability truth lives in `openspec/specs`, summary records live in `openspec/merged`, and raw retired change folders used to remain in `openspec/archive`. The workflow is still harder to reason about than it should be because `merged` and `specs` are not consistently aligned. The repo also still contains a separate top-level `specs/` workflow that is not part of OpenSpec and is internally inconsistent.

In addition, `docs/plans` is being used as a second planning/backlog system. Those documents overlap with feature proposals and implementation plans that should instead live under `openspec/changes`.

The root `docs` tree also has overlapping auth documents with different levels of freshness. Those should be collapsed into one current reference to reduce confusion.

The `docs/docker` folder has the same problem: multiple overlapping security, deployment, checklist, summary, and test-result files describe one Docker setup. That should be reduced to one canonical Docker instruction doc that matches the real repo configuration.

The remaining root setup and deployment docs have similar drift. `docs/DEVELOPER_SETUP.md`, `docs/local-dev-setup.md`, `docs/RAILWAY_DEPLOYMENT.md`, and `docs/deployment/mobile-testflight.md` overlap, contradict current commands, and mix repo-wide guidance with environment-specific troubleshooting.

The final root `docs` survivors also split across multiple ownership models. Some are really agent-facing repo instructions (`auth`, `setup`, `deployment`, `docker`, TypeScript baseline), some are stale planning or analysis artifacts with no active owner, and some duplicate guidance that already belongs in repo skills or OpenSpec.

The current `.github/instructions` set is slimmer than the old root docs, but it is still a second guidance layer beside skills. If the repo is comfortable trusting modern models to pick the right skill, then the extra routing layer should be removed rather than maintained forever.

This change is small in code footprint but cross-cutting in workflow impact because it affects OpenSpec guidance, archive semantics, and existing completed history on disk.

## Goals / Non-Goals

**Goals:**
- Make `openspec/specs` the only completed OpenSpec source of truth.
- Remove `openspec/archive` from the live workflow and clean up archived folders.
- Remove `openspec/merged` from the live workflow and clean up merged change records.
- Remove the legacy top-level `specs/` planning tree so there is only one spec workflow in the repo.
- Migrate surviving `docs/plans` content into `openspec/changes` so OpenSpec is the only planning workflow in the repo.
- Consolidate overlapping auth docs into one canonical current reference.
- Consolidate overlapping Docker docs into one canonical current reference.
- Consolidate overlapping setup and deployment docs into one canonical repo-level setup guide and one canonical repo-level deployment guide.
- Move all remaining repo-wide instructional guidance out of `docs/` and into canonical GitHub skills with matching lightweight Codex skill wrappers.
- Delete `.github/instructions` entirely once all repo references point to the skill layer.
- Update guidance so future close-out flows do not recreate raw archives or merged change-history docs.

**Non-Goals:**
- Changing how active work is authored under `openspec/changes`.
- Redesigning the merged record format.
- Preserving per-change forensic artifacts outside the canonical specs and merged records.

## Decisions

### Use `specs` as the only completed OpenSpec source of truth

`openspec/specs` is the only structure that answers the durable question the repo actually needs: what capabilities and requirements are true now. Removing `openspec/merged` avoids maintaining a second completed layer that has already drifted from the canonical behavior tree.

Alternative considered:
- Keep `merged` and improve discipline. Rejected because the repo already shows that maintaining both layers consistently is not happening in practice.

### Remove raw archive retention entirely

Completed changes will no longer leave behind proposal, design, tasks, verification files, or merged change-history docs after their canonical specs are finalized. This matches the desired simpler operating model and eliminates duplicate storage.

Alternative considered:
- Keep `archive` only for exceptional cases. Rejected because a partial exception-based policy would be harder to enforce and reason about than a single rule.

### Perform a one-time repository cleanup

Existing `openspec/archive`, `openspec/merged`, stale top-level `specs/`, `docs/plans` planning content, and overlapping auth docs should be migrated or removed in the same change that updates workflow guidance. Doing that together keeps the filesystem aligned with the repo's actual sources of truth.

The same approach should apply to setup and deployment docs: replace overlapping root guidance with a single setup entrypoint and a single deployment entrypoint, then remove stale duplicates rather than keeping competing instructions.

For the final cleanup pass, the repo should adopt a strict ownership rule:

- `.github/instructions`: repo-wide agent and contributor instructions
- `openspec/changes`: planning, proposals, and future work
- `openspec/specs`: canonical completed capability contracts
- service-local README or deployment docs: service-specific operational detail

Any root `docs` file that does not clearly fit one of those homes should be deleted rather than preserved as an orphan.

For guidance ownership, the repo should adopt this split:

- `.github/skills`: canonical reusable guidance bodies
- `.codex/skills`: lightweight wrappers that point Codex at the canonical GitHub skill bodies
- `openspec/changes` and `openspec/specs`: planning and canonical product/workflow contracts

This removes the duplicated instruction layer and leaves one reusable guidance system.

Alternative considered:
- Change the docs first and defer deletion. Rejected because the repo would still visibly contradict the new workflow until a later cleanup pass.

## Risks / Trade-offs

- Loss of raw planning and narrative change history for completed changes -> Mitigation: rely on canonical specs as the only supported long-term record.
- Older docs or scripts may still reference `openspec/archive`, `openspec/merged`, the legacy top-level `specs/` tree, or `docs/plans` -> Mitigation: sweep live guidance and workflow references in the same change.
- Some `docs/plans` files may mix completed and proposed work -> Mitigation: classify each file before migration and only create OpenSpec changes for surviving future work.
- Historical investigation becomes harder for completed changes -> Mitigation: accept this as an intentional simplification trade-off.
- Setup and deployment docs may encode machine-specific workarounds that are still useful to one environment -> Mitigation: keep only repo-backed default paths in canonical docs and move any remaining niche details to the closest service-level README if they are still needed.
- Some deleted analysis docs may contain ideas that are not yet captured elsewhere -> Mitigation: preserve only the content that still maps to an active OpenSpec change or a live instruction contract; delete the rest as intentional simplification.
- Skill-only routing could reduce deterministic path-based guidance selection in some tools -> Mitigation: keep skill names explicit, update repo guidance to point at them directly, and accept this as an intentional simplification trade-off.

## Migration Plan

1. Update the `openspec-workflow` spec to define specs-only completed history.
2. Remove live references that instruct users or agents to retain `openspec/archive`, `openspec/merged`, the legacy top-level `specs/` workflow, or `docs/plans` as a planning source.
3. Migrate surviving `docs/plans` documents into `openspec/changes`.
4. Delete the existing `openspec/archive`, `openspec/merged`, stale top-level `specs/`, and `docs/plans` trees once guidance and specs agree on the new model.
5. Verify `openspec list --json` and the remaining OpenSpec layout still behave as expected.

Rollback strategy:
- Restore `openspec/archive`, `openspec/merged`, the legacy `specs/` tree, and `docs/plans` from version control and revert the workflow guidance/spec changes if the repo still depends on them.

## Open Questions

- None at proposal time.
