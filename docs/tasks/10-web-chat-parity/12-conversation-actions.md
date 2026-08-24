---
type: task
id: WEB-CHAT-12
title: Add the web chat conversation action surface
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - ui
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-00
  - WEB-CHAT-10
  - WEB-CHAT-13
blocks: []
---

# Add the web chat conversation action surface

Add a detail-level toolbar/menu that owns search, response settings, debug,
transform actions, archive, and new-chat navigation. Keep unavailable actions
disabled or absent according to the approved contract.

## Acceptance criteria

- The action surface is available from chat detail and keyboard accessible.
- Pending actions disable only the affected control.
- Missing conversations do not expose actions that cannot succeed.
- Each action delegates to a focused hook rather than a monolithic controller.

