---
type: task
id: CHAT-DELETE-01
title: Add authorized message deletion and dependent cleanup
status: ready
priority: high
team: chat
project: chat-message-delete
labels:
  - database
  - storage
  - authorization
estimate: M
assignee: unassigned
depends_on:
  - CHAT-DELETE-00
blocks:
  - CHAT-DELETE-02
---

# Add authorized message deletion and dependent cleanup

## File

`packages/db/src/services/chats/chat.repository.ts`

## Implementation

Add `deleteMessage(handle, messageId, userId)` with ownership and chat-membership verification. Apply the approved role and history semantics. Delete or detach linked file/tool-call/audio records according to the approved cleanup contract, returning the storage references that a service layer must remove when database code does not own object deletion. Touch `lastMessageAt` to the newest remaining message or the approved null value.

Use a transaction for message and related-row changes. Keep row types private and return an explicit DTO/result. Add tests for first, middle, last, wrong-user, wrong-chat, forbidden-role, dependent-record, and rollback cases.
