---
type: task
id: WEB-CHAT-08
title: Wire web user-message editing
status: ready
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - mutation
estimate: M
assignee: unassigned
depends_on: []
blocks: []
---

# Wire web user-message editing

Replace the no-op `updateMessage` function in `useChatMessages` with the typed
message PATCH mutation and add the existing Omiro-style edit interaction to
eligible user messages.

## Acceptance criteria

- Only non-streaming user messages can be edited.
- Empty content is rejected before mutation.
- The transcript updates optimistically and rolls back on failure.
- A fresh query returns the saved content.

