---
type: task
id: CHAT-EDIT-01
title: Add authorized single-message content update
status: ready
priority: high
team: chat
project: chat-message-edit
labels:
  - database
  - authorization
  - chat
estimate: S
assignee: unassigned
depends_on: []
blocks:
  - CHAT-EDIT-02
---

# Add authorized single-message content update

## File

`packages/db/src/services/chats/chat.repository.ts`

## Implementation

Add `updateMessageContent(handle, messageId, userId, content)` following repository conventions. Verify the message belongs to the supplied user and chat before updating. Reject assistant, system, tool, and streaming/in-progress messages. Trim/validate content at the same boundary as the existing send path; reject empty content.

Update only message content and the chat `lastMessageAt` field. Return the repository DTO or an explicit success result already used by sibling methods. Do not expose a raw Kysely row type.

## Tests

Cover successful user-message update, wrong-user rejection, wrong-chat rejection, forbidden roles, empty content, and timestamp update. Confirm no unrelated message changes.

## Acceptance criteria

- An authorized user message can be updated.
- Unauthorized or forbidden messages cannot be updated.
- The method is transactional if both message and chat rows are written.
- Tests prove the stored content survives a fresh read.
