---
type: task
id: WEB-CHAT-09
title: Wire web message deletion
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - mutation
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-00
blocks: []
---

# Wire web message deletion

Resolve the approved delete semantics, replace the no-op `deleteMessage`
function, and expose the action from the message presentation with explicit
confirmation and rollback behavior.

## Acceptance criteria

- The approved eligible roles and ownership checks are enforced.
- Destructive confirmation names the message action clearly.
- Failed deletion restores the message and surfaces recovery copy.
- No unrelated messages or chat metadata are changed.

