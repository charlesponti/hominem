---
type: task
id: SMART-CREATE-02
title: Build adaptive compose submit and override
status: ready
priority: high
team: omiro
project: smart-creation-defaults
labels:
  - compose
  - gestures
  - accessibility
estimate: M
assignee: unassigned
depends_on:
  - SMART-CREATE-01
---

# Build adaptive compose submit and override

## Implementation

1. Add `useComposeClassifier(draft)` using the pure heuristic and the approved debounce behavior.
2. Update the submit control label to the approved chat/note labels without changing the existing `useCreateChat` or `useCreateNote` mutations.
3. Animate only label/content changes; preserve a fixed control size so the composer does not jump as the label changes.
4. Add long-press expansion into two explicit actions, with cancellation if the gesture ends outside the action area.
5. Provide an accessible alternate action for users who cannot long-press.
6. Disable all submit variants while a mutation is pending and prevent duplicate submissions.
7. Preserve draft recovery on mutation failure.
8. Remove `ComposeKindSheet` only after this path passes verification; do not leave two competing kind-selection mechanisms active.

## Acceptance criteria

- The label updates after the approved debounce interval without flicker.
- The default action creates the classifier's kind.
- The alternate action creates the opposite kind.
- Long-press and the accessible equivalent expose both actions.
- Pending, success, cancellation, and failure states are deterministic and testable.
