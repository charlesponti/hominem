---
type: task
id: VISUAL-MERGE-03
title: Add post-submit chat or note selection sheet
status: ready
priority: high
team: omiro
project: visual-merge
labels:
  - compose
  - bottom-sheet
  - mutations
estimate: M
assignee: unassigned
depends_on:
  - VISUAL-MERGE-00
---

# Add post-submit chat or note selection sheet

## Files to inspect and update

Locate `ComposerDock`, `Composer`, `useCreateChat`, `useCreateNote`, and the repository's existing bottom-sheet primitive before editing. Add `ComposeKindSheet` beside the owning compose components.

## Implementation

1. Remove `entryMode` from the compose bar's public contract and delete only state that exists solely to render that toggle.
2. On a valid submit, preserve the draft and open the sheet with exactly two actions: Send as chat and Save as note.
3. Apply the approved smart default from VISUAL-MERGE-00; the default action must be visibly selected and keyboard/VoiceOver accessible.
4. Invoke only the selected existing mutation. Do not send both mutations and do not create a duplicate on repeated taps.
5. Disable actions while the selected mutation is pending, handle failure without losing the submitted text, and close the sheet only after success or explicit dismissal behavior is approved.
6. After success, invalidate/update the merged inbox cache and preserve the existing navigation/toast behavior for newly created content.
7. Add `testID`s to the sheet, both actions, pending state, and error/retry path.

## Acceptance criteria

- Short single-line text defaults to chat; long or multiline text defaults to note, using the approved threshold.
- The user can select the non-default kind.
- Dismissal follows the approved contract and never silently loses text.
- Double tapping cannot create two records.
- Mutation failure preserves recoverable text and exposes a retry path.
