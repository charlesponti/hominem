---
type: task
id: WEB-CHAT-07
title: Add assistant-message regeneration on web
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - ai
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-00
  - WEB-CHAT-04
blocks: []
---

# Add assistant-message regeneration on web

Add the typed regeneration mutation and message action. Reuse the send-path
stream lifecycle, usage accounting, cancellation, and cache reconciliation.
Apply the approved ordering semantics for middle and final assistant messages.

## Acceptance criteria

- Eligible assistant messages expose regenerate.
- Regeneration cannot race with send or another regeneration.
- Cancellation and failure restore the approved prior state.
- Last and middle-message ordering behavior is covered by tests and a browser flow.

## Implementation update — 2026-08-24

- Added a typed web regeneration hook using the existing assistant-message regeneration endpoint.
- Assistant messages expose a disabled-while-active regenerate action and reconcile chat/list caches after completion.
- Added focused hook coverage for the request boundary and concurrent regeneration guard.
- Browser ordering and cancellation verification remain open.
- Consolidated regeneration Storybook coverage into one interactive conversation harness with middle- and final-message states, plus a focused single-message action story.
