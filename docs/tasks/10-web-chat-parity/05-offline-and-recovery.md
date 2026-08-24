---
type: task
id: WEB-CHAT-05
title: Add chat offline and recoverable error states
status: proposed
priority: high
team: web
project: web-chat-parity
labels:
  - web
  - chat
  - resilience
estimate: M
assignee: unassigned
depends_on:
  - WEB-CHAT-04
blocks:
  - WEB-CHAT-22
---

# Add chat offline and recoverable error states

Add explicit offline detection and user-facing recovery for initial load,
message send, stream failure, upload failure, and missing conversations.
Preserve raw draft text and attachments whenever retry is safe.

## Acceptance criteria

- Offline send is blocked with actionable copy and no lost draft.
- Stream and load errors have retry controls.
- Missing/deleted chats render a recovery state rather than an empty transcript.
- Error states are covered at the route and hook boundaries.

