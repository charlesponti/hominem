---
type: task
id: VISUAL-MERGE-01
title: Replace chat and note root tabs with All and kind filters
status: ready
priority: high
team: omiro
project: visual-merge
labels:
  - navigation
  - inbox
  - filters
estimate: M
assignee: unassigned
depends_on:
  - VISUAL-MERGE-00
blocks:
  - VISUAL-MERGE-02
  - VISUAL-MERGE-04
---

# Replace chat and note root tabs with All and kind filters

## Files to inspect and update

Find the owning files before editing, then record the exact paths in the PR: `WorkspaceScreen`, `WorkspaceToolbar`, `InboxList`, workspace context/types, and existing inbox tests under `apps/omiro`.

## Implementation

1. Replace only the root `Chats | Notes | Time` presentation with `All | Time`.
2. Make All the merged default and preserve Time as the existing second root destination.
3. Add two mutually exclusive kind filter pills inside All: no pill selected means both kinds; selecting Chats or Notes filters the already-loaded `items` array.
4. Preserve search state, per-kind empty-state selection, pull-to-refresh, infinite scroll, and per-kind scroll/cache behavior unless the owning code proves those states are root-context keyed.
5. Remove `activeContentContext` only where it represents root tab ownership. Do not remove kind information needed for routing, rendering, cache keys, or entity lookup.
6. Give each control a stable `testID`, selected accessibility state, and a deterministic active/inactive visual state.

## Acceptance criteria

- All initially shows chats and notes ordered by the API's existing `updatedAt` order.
- Chats and Notes filters show only the selected kind and can be cleared back to All.
- Time navigation and its screen are unchanged.
- Search, refresh, infinite scroll, detail navigation, and empty states remain functional in All and filtered states.
- No new root route or tab is introduced.
