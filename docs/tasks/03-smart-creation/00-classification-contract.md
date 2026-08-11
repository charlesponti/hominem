---
type: task
id: SMART-CREATE-00
title: Approve smart creation classification contract
status: blocked
priority: high
team: omiro
project: smart-creation-defaults
labels:
  - product-decision
  - compose
estimate: S
assignee: unassigned
depends_on: []
blocks:
  - SMART-CREATE-01
  - SMART-CREATE-02
---

# Approve smart creation classification contract

## Decisions required

- Confirm Tier 1 heuristic-only launch; do not ship LLM classification in this stage.
- Confirm rule precedence when a draft is long, multiline, interrogative, or imperative at the same time.
- Confirm empty/whitespace-only behavior.
- Confirm long-press duration and whether it is available to VoiceOver/keyboard users through an equivalent accessible action.
- Confirm exact PostHog event name and properties for default kind, selected kind, and override.
- Confirm whether classification updates while editing or only after the debounce interval.

## Acceptance criteria

- The precedence table and exact labels are recorded here.
- The override action has a non-gesture equivalent.
- No API work is required for the approved first release.
