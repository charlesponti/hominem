---
type: task
id: CHAT-DELETE-00
title: Approve chat message deletion semantics
status: blocked
priority: urgent
team: chat
project: chat-message-delete
labels:
  - product-decision
  - data-integrity
estimate: S
assignee: unassigned
depends_on: []
blocks:
  - CHAT-DELETE-01
  - CHAT-DELETE-03
---

# Approve chat message deletion semantics

Define what deleting a middle message means for future AI history: remove only the row and let later history close the gap, truncate all later messages, or retain a tombstone excluded from the UI but included in history. Also define whether deletion is available for user, assistant, system, and tool roles; exact confirmation copy; undo availability; and whether deleting a message with generated audio removes the storage object immediately.

## Acceptance criteria

- The chosen history behavior is written here with examples for first, middle, and last messages.
- Role eligibility and confirmation behavior are explicit.
- Dependent file/tool-call/audio cleanup ownership is explicit.
- Repository, API, cache, and tests can implement the same semantics without guessing.
