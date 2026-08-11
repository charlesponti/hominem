---
type: task
id: CHAT-DELETE-03
title: Wire optimistic chat message deletion
status: ready
priority: high
team: omiro
project: chat-message-delete
labels:
  - mobile
  - optimistic-ui
  - destructive-action
estimate: M
assignee: unassigned
depends_on:
  - CHAT-DELETE-02
---

# Wire optimistic chat message deletion

Add `useDeleteChatMessage(chatId)` following existing mutation conventions. Snapshot and remove the target from `chatKeys.messages(chatId)` on mutate, invalidate/reconcile on success, and restore the exact message object on failure. Pass `onDelete` from `ChatDetailScreen` to `ChatMessageList` only after applying the approved role eligibility. Keep destructive styling, confirmation, pending, and undo behavior consistent with CHAT-DELETE-00. Prevent deletion while streaming and prevent duplicate requests.

## Acceptance criteria

- The real delete action is reachable for every approved eligible message.
- The message disappears immediately, persists after refetch, and restores on failure.
- The UI communicates destructive action and pending state without accidental activation.
- Subsequent message history reflects the approved semantics.
