## Context

The legacy plan describes a phased replacement of custom chat components with AI Elements primitives. The migration goal is to keep that initiative actionable inside OpenSpec.

## Goals / Non-Goals

**Goals:**
- Preserve the AI Elements adoption scope in OpenSpec.
- Keep the plan organized by shared components, app integration, and testing.
- Capture the work as a reusable chat UI capability rather than a one-off note.

**Non-Goals:**
- Replacing the AI backend itself.
- Expanding beyond the chat/UI surfaces described in the original plan.

## Decisions

### Treat the work as a shared chat UI capability

The work spans shared UI components and app chat routes, so it fits best as one reusable capability.

### Preserve phased component rollout

The original plan already separates foundational components, chat updates, advanced elements, voice enhancements, and testing. The migrated tasks keep that order.

## Risks / Trade-offs

- Shared UI changes can affect multiple product surfaces -> Mitigation: keep integration and verification explicit.
- Some advanced AI Elements pieces may not be necessary for the first pass -> Mitigation: preserve phased rollout rather than requiring everything at once.

## Migration Plan

1. Capture the AI Elements plan as an OpenSpec change.
2. Remove the old docs/plans file.
3. Continue implementation from the OpenSpec artifacts.

## Open Questions

- None during migration.
