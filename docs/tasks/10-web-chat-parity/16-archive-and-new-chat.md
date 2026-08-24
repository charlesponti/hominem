---
type: task
id: WEB-CHAT-16
title: Complete web archive and new-chat detail actions
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - navigation
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-12
blocks: []
---

# Complete web archive and new-chat detail actions

Expose archive from the active conversation and chat list rows, remove archived
items from active navigation according to the approved optimistic contract, and
add the detail-toolbar action for creating a new chat.

## Acceptance criteria

- Archive has confirmation or the approved direct-action behavior.
- Successful archive routes away from the archived conversation.
- Archive failure restores active-list state.
- New chat from detail disables while pending and navigates only after creation.

