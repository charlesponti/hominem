---
type: task
id: WEB-CHAT-06
title: Add retry for failed and interrupted responses
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - recovery
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-04
blocks: []
---

# Add retry for failed and interrupted responses

Render retry actions for failed user sends and interrupted assistant replies.
Retain the last valid input or target message, prevent concurrent retry and
send operations, and reconcile the result through the shared stream lifecycle.

## Acceptance criteria

- Failed user rows can be retried without duplicating successful messages.
- Interrupted assistant replies can be retried from the approved history.
- Retry is disabled while another generation is active.
- Failure after retry remains recoverable and preserves the correct state.

