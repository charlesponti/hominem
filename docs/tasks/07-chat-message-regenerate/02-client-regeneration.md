---
type: task
id: CHAT-REGENERATE-02
title: Stream regenerated assistant responses in chat
status: ready
priority: high
team: omiro
project: chat-message-regenerate
labels:
  - mobile
  - streaming
  - optimistic-ui
estimate: M
assignee: unassigned
depends_on:
  - CHAT-REGENERATE-01
---

# Stream regenerated assistant responses in chat

## Files to locate/update

- `apps/omiro` chat service hooks;
- `stream-sse.ts`;
- `chat-stream-cache.ts`;
- `ChatDetailScreen`, `ChatMessageList`, and message action types.

## Implementation

1. Add `useRegenerateChatMessage(chatId)` using the new typed RPC route.
2. Snapshot the message cache before removing/replacing the target according to the approved semantics.
3. Reuse the existing SSE consumer and streaming placeholder lifecycle.
4. Pass `onRegenerate` from `ChatDetailScreen` only when the message is eligible and the chat is not already streaming.
5. On cancellation or failure, restore or reconcile cache and server state according to the server contract; never leave a duplicate assistant placeholder.
6. Disable regeneration while any stream is active and prevent concurrent regenerate requests.

## Acceptance criteria

- The target assistant message is replaced by a streamed response.
- The UI shows pending, token streaming, completion, cancellation, and failure states.
- Cache state matches a fresh fetch after success and failure.
- Later messages behave exactly as approved in CHAT-REGENERATE-00.
