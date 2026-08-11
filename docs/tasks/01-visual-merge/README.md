---
type: project-index
status: proposed
priority: high
team: omiro
project: visual-merge
labels:
  - omiro
  - inbox
  - compose
source: ../01-visual-merge.md
---

# Visual Merge

## Dependency order

1. `VISUAL-MERGE-00`: confirm the compose and navigation contract.
2. `VISUAL-MERGE-01`: change the workspace context and filters.
3. `VISUAL-MERGE-02`: add kind indicators and unified list ownership.
4. `VISUAL-MERGE-03`: replace the composer mode toggle with the kind sheet.
5. `VISUAL-MERGE-04`: verify interaction, pagination, refresh, and empty states.

## Guardrails

- Keep `GET /api/inbox`, `useInboxStreamItems`, `InboxEntityMap`, Time, detail routes, and per-kind cache/scroll semantics unchanged unless a ticket explicitly names them.
- Do not add a new root destination.
- The default merged view is neither chat-only nor note-only.
- All mobile validation uses Maestro on the booted iPhone simulator per repository policy.
