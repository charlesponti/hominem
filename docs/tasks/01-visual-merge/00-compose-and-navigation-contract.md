---
type: task
id: VISUAL-MERGE-00
title: Approve merged inbox and compose contract
status: blocked
priority: urgent
team: omiro
project: visual-merge
labels:
  - product-decision
  - navigation
  - compose
estimate: S
assignee: unassigned
depends_on: []
blocks:
  - VISUAL-MERGE-01
  - VISUAL-MERGE-02
  - VISUAL-MERGE-03
---

# Approve merged inbox and compose contract

## Objective

Record product approval for replacing root `Chats | Notes | Time` with `All | Time`, placing kind filters inside All, and showing a kind-selection sheet after submit.

## Decisions to record

- Whether the root label is exactly `All` and whether it includes both chats and notes by default.
- Whether the compose sheet appears after every successful text submit or only when the draft is ambiguous.
- Exact sheet labels, primary/secondary ordering, dismissal behavior, and whether the default option is selected by the 140-character/no-line-break rule.
- Whether the unified All empty state needs a new asset or can use an existing neutral asset.

## Acceptance criteria

- The approved root contexts and filter states are written here.
- The approved compose decision is deterministic for empty, short single-line, long, and multiline drafts.
- The decision explicitly says what dismissal does to the submitted draft.
- No implementation ticket relies on an unstated navigation or compose behavior.
