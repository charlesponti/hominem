---
type: task
id: CROSS-LINK-04
title: Render linked indicators and detail banners
status: ready
priority: medium
team: omiro
project: cross-linking
labels:
  - mobile
  - inbox
  - navigation
estimate: M
assignee: unassigned
depends_on:
  - CROSS-LINK-02
  - CROSS-LINK-03
blocks:
  - CROSS-LINK-05
---

# Render linked indicators and detail banners

Update `InboxStreamItem` to render the approved linked subtitle/icon without changing the primary row tap destination. Tapping the linked affordance must navigate to the target item, not the source row. Add compact banners to `ChatDetailScreen` and `NoteDetailScreen` with target title, kind, deleted-target state, and deterministic navigation. Avoid recursive link expansion; show one level only.

## Acceptance criteria

- Chat-saved-as-note and note-with-discussion render distinct, correct indicators.
- A banner is absent for unlinked items.
- Deleted targets render the approved fallback and do not crash the source screen.
- Deep links and back navigation preserve the existing stack behavior.
