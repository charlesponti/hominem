## Context

The repo currently has a split completed-work model: canonical capability truth lives in `openspec/specs`, summary records live in `openspec/merged`, and raw retired change folders used to remain in `openspec/archive`. The workflow is still harder to reason about than it should be because `merged` and `specs` are not consistently aligned. The repo also still contains a separate top-level `specs/` workflow that is not part of OpenSpec and is internally inconsistent.

This change is small in code footprint but cross-cutting in workflow impact because it affects OpenSpec guidance, archive semantics, and existing completed history on disk.

## Goals / Non-Goals

**Goals:**
- Make `openspec/specs` the only completed OpenSpec source of truth.
- Remove `openspec/archive` from the live workflow and clean up archived folders.
- Remove `openspec/merged` from the live workflow and clean up merged change records.
- Remove the legacy top-level `specs/` planning tree so there is only one spec workflow in the repo.
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

Existing `openspec/archive`, `openspec/merged`, and stale top-level `specs/` content should be removed in the same change that updates workflow guidance. Doing all three together keeps the filesystem aligned with the spec and avoids lingering ambiguity about which model is current.

Alternative considered:
- Change the docs first and defer deletion. Rejected because the repo would still visibly contradict the new workflow until a later cleanup pass.

## Risks / Trade-offs

- Loss of raw planning and narrative change history for completed changes -> Mitigation: rely on canonical specs as the only supported long-term record.
- Older docs or scripts may still reference `openspec/archive`, `openspec/merged`, or the legacy top-level `specs/` tree -> Mitigation: sweep live guidance and workflow references in the same change.
- Historical investigation becomes harder for completed changes -> Mitigation: accept this as an intentional simplification trade-off.

## Migration Plan

1. Update the `openspec-workflow` spec to define specs-only completed history.
2. Remove live references that instruct users or agents to retain `openspec/archive`, `openspec/merged`, or the legacy top-level `specs/` workflow.
3. Delete the existing `openspec/archive`, `openspec/merged`, and stale top-level `specs/` trees once guidance and specs agree on the new model.
4. Verify `openspec list --json` and the remaining OpenSpec layout still behave as expected.

Rollback strategy:
- Restore `openspec/archive`, `openspec/merged`, and the legacy `specs/` tree from version control and revert the workflow guidance/spec changes if the repo still depends on them.

## Open Questions

- None at proposal time.
