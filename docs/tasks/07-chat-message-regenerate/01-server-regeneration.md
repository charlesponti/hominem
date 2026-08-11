---
type: task
id: CHAT-REGENERATE-01
title: Add metered assistant message regeneration RPC
status: ready
priority: high
team: api
project: chat-message-regenerate
labels:
  - api
  - ai
  - streaming
  - usage-accounting
estimate: L
assignee: unassigned
depends_on:
  - CHAT-REGENERATE-00
blocks:
  - CHAT-REGENERATE-02
---

# Add metered assistant message regeneration RPC

## Files

- `services/api/src/rpc/routes/chats.ts`
- the shared chat repository under `packages/db/src/services/chats/`
- existing stream/usage helpers used by `POST /api/chats/:id/stream`
- adjacent chat RPC integration tests

## Implementation

1. Verify chat ownership with `getOwnedOrThrow`.
2. Verify the target belongs to the chat and is an assistant message.
3. Apply the approved ordering semantics from CHAT-REGENERATE-00 transactionally before starting a new stream.
4. Build exactly the same preceding history shape as the send path.
5. Call `assertUnderMonthlyUsageLimit` before model invocation and record usage with `recordAIUsageEvent` using the same dimensions as send.
6. Reuse the existing SSE framing, cancellation, error, and persisted-assistant-message behavior. Do not fork a subtly different stream protocol.
7. Ensure a failed model call leaves the conversation in the approved consistent state and does not charge usage for an uncompleted request unless the existing accounting contract says otherwise.

## Acceptance criteria

- Unauthorized, wrong-role, wrong-chat, missing, streaming, and invalid targets fail safely.
- Monthly limits apply identically to send and regenerate.
- The chosen ordering semantics are observable in fresh database reads.
- SSE clients can consume the replacement without protocol changes.
