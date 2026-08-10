# Task: Chat Message Regenerate

**Risk: High** — re-invokes the model and mutates the message stream; needs usage-accounting parity with the send path.

## Goal

Let the user re-run the last assistant response for a chat message. The button exists; the backend path does not.

## Current state

- `ActiveMessageActions` renders the regenerate (`arrow.clockwise`) button when `canRegenerate` is true (`chat-message-actions.tsx`).
- `ChatMessage` computes `canRegenerate = !isUser && !isStreaming && onRegenerate !== undefined` and calls `onRegenerate(message.id)` (`chat-message.tsx`).
- `onRegenerate` is threaded through `ChatMessageList` → `ChatMessage` → `ActiveMessageActions`, but `ChatDetailScreen` never passes it — the button never renders.
- The send path is `POST /api/chats/:id/stream` (`services/api/src/rpc/routes/chats.ts:228`): builds history from `ChatRepository.getMessages(chatId, 30, 0)`, inserts the user message, streams a completion via `streamChatCompletion`, and records AI usage (`recordAIUsageEvent`). The client stream-consumer lives in `services/chat/stream-sse.ts` / `chat-stream-cache.ts`.

## Scope

1. **Route**: add `POST /api/chats/:id/messages/:messageId/regenerate` that:
   - verifies ownership (`getOwnedOrThrow`) and that `:messageId` is an assistant message in this chat,
   - removes the target assistant message and any later messages in the chat (or re-labels the strategy explicitly),
   - re-invokes the model with the same preceding history and streaming path, reusing the usage-accounting from `/stream`.
   Two candidate semantics — "replace just this one reply" vs "replace from this point forward" — are a product decision; pick one explicitly in the PRD/spec before implementing.
2. **Client hook**: `useRegenerateChatMessage(chatId)` reusing the SSE consumer; optimistically remove the old assistant message and stream the replacement.
3. **Wiring**: `ChatDetailScreen` passes `onRegenerate` to `ChatMessageList`.

## Risks

- **Model cost**: regeneration burns tokens and AI-usage quota. Must assert `assertUnderMonthlyUsageLimit` and record usage exactly like the send path, or users bypass limits by regenerating repeatedly.
- **Streaming UI**: the placeholder/streaming states must handle mid-stream cancellation and failure the same way the send path does.
- **Ordering**: deciding whether later messages survive regeneration changes the conversation; needs an explicit product decision before building.

## Success criteria

1. Regenerating an assistant message produces a new reply streamed into the UI.
2. Usage is accounted and the monthly limit is enforced on the regenerate path.
3. Cancel/failure leaves the chat consistent (no duplicate or orphaned messages).
4. The chosen ordering semantics (single-reply vs truncate-forward) behave exactly as specified.
