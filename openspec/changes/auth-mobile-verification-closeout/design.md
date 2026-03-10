## Context

The legacy auth plan mostly documents already-completed architecture work. What remains active is the final verification and operational closeout for mobile auth readiness.

## Goals / Non-Goals

**Goals:**
- Preserve the remaining auth/mobile verification work in OpenSpec.
- Separate unfinished hardening tasks from historical auth narrative.
- Keep the focus on final readiness gates rather than re-documenting the completed rewrite.

**Non-Goals:**
- Re-planning the entire auth architecture.
- Recreating historical migration records as active work.

## Decisions

### Focus the migrated change on remaining work only

The old plan contains a large amount of completed context. The OpenSpec change should only carry forward the unfinished readiness items.

### Represent closeout as one readiness capability

The remaining work is cohesive: verification, operational readiness, and sign-off. A single readiness capability keeps the migration understandable.

## Risks / Trade-offs

- Some “remaining” items may already be complete -> Mitigation: validate the task list before implementation.
- Operational tasks may span code and docs -> Mitigation: keep verification and runbook work explicit in tasks.

## Migration Plan

1. Capture the unfinished auth/mobile readiness work in OpenSpec.
2. Remove the legacy docs/plans version.
3. Continue implementation only from the OpenSpec change.

## Open Questions

- None during migration.
