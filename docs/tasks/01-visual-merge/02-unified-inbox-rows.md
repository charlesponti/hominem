---
type: task
id: VISUAL-MERGE-02
title: Add kind indicators and unified inbox ownership
status: ready
priority: medium
team: omiro
project: visual-merge
labels:
  - inbox
  - components
  - accessibility
estimate: S
assignee: unassigned
depends_on:
  - VISUAL-MERGE-01
---

# Add kind indicators and unified inbox ownership

## Implementation

1. Add a `leading` prop to `InboxStreamItem` or the nearest item wrapper and pass it to the existing `StreamItem` leading slot.
2. Map chat to `bubble.left` and note to `doc.text` using the existing SF Symbol/icon abstraction.
3. Keep the existing preview distinction: chats remain compact and notes retain their text snippet.
4. Move filtering ownership to `InboxList` only if the current parent passes pre-filtered items; otherwise keep filtering at the current owner and add only the icon prop.
5. Ensure the icon is decorative when the row already announces its kind, or provide an accessible kind label when the row would otherwise be ambiguous.

## Acceptance criteria

- Every chat and note row in All has the correct icon.
- Icons do not change row height or cause title/preview overlap.
- Tapping a row still opens the existing chat or note route.
- Filtered and empty states use the correct kind-specific copy.
- No API or entity-map changes are made.
