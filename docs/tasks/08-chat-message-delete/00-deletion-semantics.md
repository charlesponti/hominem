---
type: task
id: CHAT-DELETE-00
title: Approve chat message deletion semantics
status: completed
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

## Approved semantics

- Deleting a user message truncates that message and every later message in the same chat.
- Only persisted user messages authored by the authenticated chat owner are eligible.
- The UI requires explicit confirmation with copy that names the message and later-message deletion.
- There is no undo action in this delivery.
- Chat speech-run rows cascade with message deletion. Message-owned generated audio is queued for storage cleanup with retries.
- Reusable uploaded attachments remain in the shared file store; they are references, not message-owned dependents.
- Storage cleanup failure does not roll back the message deletion; the cleanup job retries asynchronously.

Define what deleting a middle message means for future AI history: remove only the row and let later history close the gap, truncate all later messages, or retain a tombstone excluded from the UI but included in history. Also define whether deletion is available for user, assistant, system, and tool roles; exact confirmation copy; undo availability; and whether deleting a message with generated audio removes the storage object immediately.

## Acceptance criteria

- The chosen history behavior is written here with examples for first, middle, and last messages.
- Role eligibility and confirmation behavior are explicit.
- Dependent file/tool-call/audio cleanup ownership is explicit.
- Repository, API, cache, and tests can implement the same semantics without guessing.
