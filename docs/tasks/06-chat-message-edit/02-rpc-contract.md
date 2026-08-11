---
type: task
id: CHAT-EDIT-02
title: Expose the chat message edit RPC
status: ready
priority: high
team: api
project: chat-message-edit
labels:
  - api
  - rpc
  - validation
estimate: S
assignee: unassigned
depends_on:
  - CHAT-EDIT-01
blocks:
  - CHAT-EDIT-03
---

# Expose the chat message edit RPC

## Files

- `services/api/src/rpc/routes/chats.ts`
- `services/api/src/rpc/app.ts` or the repository's RPC contract export
- route integration tests adjacent to the chats RPC tests

## Implementation

Add `PATCH /api/chats/:id/messages/:messageId` with a schema containing only `content`. Apply the existing auth/ownership middleware and call the repository method from CHAT-EDIT-01. Map validation, ownership, forbidden-role, and not-found failures through existing service-error handling. Do not accept role, timestamps, chat ID, or arbitrary message fields from the client.

Update the typed RPC contract and test the serialized response shape consumed by the mobile client.

## Acceptance criteria

- The route rejects missing, empty, or invalid content before database work.
- A user cannot edit another user's message by changing either path ID.
- The route cannot edit assistant/system/tool messages.
- The generated/typed client surface includes the new method.
- Integration tests cover success and each expected failure class.
