## Context

The existing plan describes a large visual cleanup across multiple apps. The main migration need is to preserve that scope in OpenSpec so the work can be tracked like other repo changes.

## Goals / Non-Goals

**Goals:**
- Represent the VOID apps cleanup as an OpenSpec change.
- Preserve the major implementation phases from the legacy plan.
- Keep the change focused on app-layer design alignment, not a new design language.

**Non-Goals:**
- Reworking the underlying shared design system primitives.
- Introducing a second design direction.

## Decisions

### Use a single app-alignment capability

The legacy plan is broad but coherent: it is one cross-app design-system alignment effort. A single capability keeps the migration simple and avoids splitting one visual initiative into artificial fragments.

### Preserve phased execution in tasks

The old plan was already organized by implementation phase, so the OpenSpec tasks keep that shape for continuity.

## Risks / Trade-offs

- Broad design changes may hide implementation cost -> Mitigation: keep tasks grouped by visual concern.
- Some app surfaces may already have partially aligned implementations -> Mitigation: verify by targeted sweep before editing.

## Migration Plan

1. Preserve the legacy plan intent in OpenSpec artifacts.
2. Remove the old docs/plans entry once the change is captured.
3. Implement later from the OpenSpec task list.

## Open Questions

- None during migration.
