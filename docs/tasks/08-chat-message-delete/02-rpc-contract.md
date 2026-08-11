---
type: task
id: CHAT-DELETE-02
title: Expose typed chat message deletion RPC
status: ready
priority: high
team: api
project: chat-message-delete
labels:
  - api
  - rpc
estimate: S
assignee: unassigned
depends_on:
  - CHAT-DELETE-01
blocks:
  - CHAT-DELETE-03
---

# Expose typed chat message deletion RPC

Add `DELETE /api/chats/:id/messages/:messageId` in `services/api/src/rpc/routes/chats.ts`, apply existing auth/ownership handling, call the repository method, perform approved storage cleanup through the existing storage service, and register the route in the RPC contract. Return the repository's explicit result; do not expose database rows. Add integration tests for success, missing message, ownership, role, and cleanup failures. Define whether storage cleanup failure fails the request or is retried, and test that behavior.
