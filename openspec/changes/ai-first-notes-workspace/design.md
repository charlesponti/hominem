## Context

The legacy plan already outlines a phased workspace overhaul centered on AI-assisted note workflows. The migration goal is to express that planned work as a proper OpenSpec change.

## Goals / Non-Goals

**Goals:**
- Preserve the AI-first workspace plan in OpenSpec.
- Capture the route, panel, note action, and bulk workflow direction.
- Keep implementation phased and incremental.

**Non-Goals:**
- Replacing the assistant backend itself.
- Introducing unplanned database changes without follow-up design.

## Decisions

### Model the work as a new workspace capability

The plan centers on a distinct workspace surface, so it maps cleanly to a new capability rather than scattered modifications.

### Keep phased delivery in tasks

The original plan already separates foundation, enhanced notes, AI actions, bulk workflows, and polish. The migrated tasks preserve that rollout.

## Risks / Trade-offs

- Workspace breadth may grow faster than the initial route can support -> Mitigation: keep the first phase additive.
- AI actions may require extra backend work -> Mitigation: treat persistence and action wiring as explicit tasks.

## Migration Plan

1. Capture the workspace plan as an OpenSpec change.
2. Remove the old docs/plans entry once the migration is complete.
3. Continue implementation from the OpenSpec task list.

## Open Questions

- None during migration.
