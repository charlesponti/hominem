---
type: task
id: VISUAL-MERGE-04
title: Verify merged inbox and compose states
status: ready
priority: high
team: omiro
project: visual-merge
labels:
  - qa
  - maestro
  - inbox
estimate: M
assignee: unassigned
depends_on:
  - VISUAL-MERGE-01
  - VISUAL-MERGE-02
  - VISUAL-MERGE-03
---

# Verify merged inbox and compose states

## Required Maestro coverage

Add or update flows under `apps/omiro/tests` for:

- All default with chats and notes interleaved by recency;
- Chats-only and Notes-only filter selection and clearing;
- search within All and within each filter;
- chat and note row navigation;
- short single-line compose default;
- long and multiline compose default;
- choosing the alternate kind;
- sheet dismissal, pending, failure, retry, and success;
- pull-to-refresh and infinite-scroll continuation;
- Time navigation and return to All;
- unified empty, filtered empty, and per-kind empty states.

Use `testID` selectors, not fuzzy text selectors inside sheets.

## Acceptance criteria

- Each affected state has a screenshot or explicit Maestro assertion.
- The smallest supported iPhone does not show clipped controls or keyboard overlap.
- No duplicate chat/note is created on repeated submit taps.
- The Time workspace passes its existing flow unchanged.
- Failures identify the exact unproven state rather than being marked complete from typecheck alone.
