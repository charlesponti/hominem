# Task: Chat Message Delete

**Risk: Low-Medium** — new API mutation and cache invalidation; no schema change.

## Goal

Let the user delete a chat message. The button exists; the mutation does not.

## Current state

- `ActiveMessageActions` renders the delete (`trash`, destructive) button when `canDelete` is true (`chat-message-actions.tsx`).
- `ChatMessage` computes `canDelete = !isStreaming && onDelete !== undefined` and calls `onDelete(message.id)` (`chat-message.tsx`).
- `onDelete` is threaded through `ChatMessageList` → `ChatMessage` → `ActiveMessageActions`, but `ChatDetailScreen` never passes it — the button never renders.
- `ChatRepository` has chat-level `delete` and `clearMessages`, but no single-message delete (`packages/db/src/services/chats/chat.repository.ts`).
- The API has no message-delete endpoint.

## Scope

1. **Repository**: add `deleteMessage(handle, messageId, userId)` — verify the message belongs to `userId` and the chat, delete the message row (and its linked file/tool-call records if FK-coupled), touch the chat's `lastMessageAt`.
2. **RPC route**: add `DELETE /api/chats/:id/messages/:messageId` in `services/api/src/rpc/routes/chats.ts`; register in the RPC contract.
3. **Client hook**: `useDeleteChatMessage(chatId)` following existing mutation conventions; optimistically remove the message, invalidate `chatKeys.messages(chatId)`.
4. **Wiring**: `ChatDetailScreen` passes `onDelete` to `ChatMessageList`.

## Risks

- **Row-cascade scope**: deleting an assistant message that owns a speech audio file must clean up the file reference (and storage object) to avoid orphans.
- **History drift**: `GET /messages` history feed for later sends derives from what remains — the same ordering question as regenerate (deleting a middle message changes later context). Confirm the intended semantics with the product owner before shipping.
- **Optimistic rollback**: if deletion fails, restore the message in cache.

## Success criteria

1. Deleting a message removes it from the UI immediately and persists across refetch.
2. Deleting is offered for any non-streaming message (user and assistant), with destructive styling and no accidental-tap risk.
3. Failure restores the message; audio-file orphans are not left behind.
4. The effect on subsequent conversation history matches the agreed semantics.
