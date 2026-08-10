# Task: Chat Message Edit

**Risk: Medium** — new API mutation and cache-invalidation wiring, no schema change.

## Goal

Let a user edit their own chat message content in place. The edit UI already exists (`MessageEditModal` in `chat-message-edit-modal.tsx`); the mutation surface does not.

## Current state

- `ActiveMessageActions` renders the edit (`square.and.pencil`) button when `canEdit` is true (`chat-message-actions.tsx`).
- `ChatMessage` computes `canEdit = isUser && !isStreaming && onEdit !== undefined` and owns the edit modal state (`isEditing`/`draftMessage`). Saving calls `onEdit(message.id, trimmedContent)` (`chat-message.tsx`).
- `onEdit` is threaded through `ChatMessageList` → `ChatMessage` → `ActiveMessageActions`, but `ChatDetailScreen` never passes it — the button never renders.
- `MessageEditModal` is already extracted and self-contained (`chat-message-edit-modal.tsx`).
- The API has no message-content update endpoint. `ChatRepository` (`packages/db/src/services/chats/chat.repository.ts`) has `insertMessage`, `getMessages`, `clearMessages`, `updateTitle`, but no single-message update.

## Scope

1. **Repository**: add `updateMessageContent(handle, messageId, userId, content)` to `ChatRepository` — verify the message belongs to `userId`, update the stored content row, touch the chat's `lastMessageAt`. Do not allow editing `assistant`/`system`/`tool` roles or streamed messages in progress.
2. **RPC route**: add `PATCH /api/chats/:id/messages/:messageId` with a content schema in `services/api/src/rpc/routes/chats.ts`; register in the RPC contract so `@hominem/api/types` exposes it.
3. **Client hook**: add `useEditChatMessage(chatId)` in `services/chat/` following the existing mutation conventions (see `use-send-message.ts` / `use-chat-archive.ts`). Optimistically update the cached message, invalidate `chatKeys.messages(chatId)` on success.
4. **Wiring**: `ChatDetailScreen` passes `onEdit` to `ChatMessageList` backed by the new hook.

## Risks

- Editing only the message text (not referenced notes or files) — keep `content` as the single editable field; do not silently reinterpret scope.
- Rollback of the optimistic update if the mutation fails must restore the original message.

## Success criteria

1. Editing a user message persists across refetch.
2. The edited content appears in the UI immediately (optimistic) and matches server state.
3. Editing is only offered for the user's own non-streaming messages.
4. Failure restores the original content.
