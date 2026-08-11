---
type: task
id: CHAT-EDIT-03
title: Wire optimistic chat message editing
status: ready
priority: high
team: omiro
project: chat-message-edit
labels:
  - mobile
  - optimistic-ui
  - chat
estimate: M
assignee: unassigned
depends_on:
  - CHAT-EDIT-02
---

# Wire optimistic chat message editing

## Files to locate/update

- `apps/omiro` chat service hooks, following `use-send-message.ts` and `use-chat-archive.ts` conventions;
- `ChatDetailScreen`;
- `ChatMessageList`, `ChatMessage`, `ActiveMessageActions` only where callback typing requires it.

## Implementation

1. Add `useEditChatMessage(chatId)` using the typed RPC client.
2. On mutate, snapshot `chatKeys.messages(chatId)` and replace only the target user message content in cache.
3. On success, reconcile with the server response and invalidate/refetch the message query.
4. On failure, restore the exact prior message object and expose the existing error feedback pattern.
5. Pass `onEdit` from `ChatDetailScreen` to `ChatMessageList`; do not loosen `canEdit` checks.
6. Preserve trimmed-content behavior from `MessageEditModal`.

## Acceptance criteria

- The edit action appears only for the user's non-streaming messages.
- The edited text appears immediately and survives refetch.
- Failure restores the original text.
- Repeated submission cannot create duplicate messages or mutations.
- Existing copy/share/delete/regenerate actions remain unchanged.
