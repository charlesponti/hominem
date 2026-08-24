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

