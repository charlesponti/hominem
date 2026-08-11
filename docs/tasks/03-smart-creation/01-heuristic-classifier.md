---
type: task
id: SMART-CREATE-01
title: Implement pure draft-kind heuristic
status: ready
priority: medium
team: omiro
project: smart-creation-defaults
labels:
  - compose
  - pure-logic
  - testing
estimate: S
assignee: unassigned
depends_on:
  - SMART-CREATE-00
blocks:
  - SMART-CREATE-02
---

# Implement pure draft-kind heuristic

## Implementation

1. Add a pure function in the compose service layer, not inside JSX, returning `{ kind: 'chat' | 'note'; confidence: 1 }`.
2. Normalize only for classification: trim surrounding whitespace, preserve the original draft for mutation.
3. Implement the approved precedence from SMART-CREATE-00 for line breaks, length threshold, question marks, imperative prefixes, and fallback.
4. Return a stable result for empty and whitespace-only drafts; the composer must still reject submission as it does today.
5. Unit-test every rule independently and combinations that exercise precedence.

## Acceptance criteria

- Classification is synchronous and has no network dependency.
- The original draft is never rewritten by the classifier.
- The result is deterministic for identical input.
- Tests cover short questions, short statements, long statements, multiline text, imperative prompts, mixed signals, and whitespace.
