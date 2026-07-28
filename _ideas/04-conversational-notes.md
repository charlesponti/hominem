# Stage 4: Conversational Notes

**Risk: High** — schema changes, new UI patterns, crosses the chat/note boundary at the entity level.

## Goal

Give every note an inline chat thread and give every chat the ability to produce a note artifact. The boundary between chatting and writing becomes fluid — a note is a document you can discuss, a chat is a conversation you can crystallize.

## Scope

### UX changes

1. **Inline chat panel in NoteDetailScreen**

   The note detail screen gains a persistent chat entry point. A bottom-anchored handle (similar to the sheet handle in Maps or the iOS keyboard dismiss bar) sits above the keyboard. Tapping or dragging it reveals a chat panel that slides up from the bottom, covering the lower portion of the screen.

   - The note's full content is injected as AI context (hidden system message). The user can refine the note based on the AI's responses.
   - The chat panel is a condensed version of `ChatDetailScreen`: message list, compose bar, send button. No toolbar, no search modal, no review overlay — just the conversation.
   - The note's editor remains visible and editable in the top portion. The user can scroll the note while the chat is open.
   - Dismissing the chat panel returns to full-screen editing. The chat history persists — reopening the panel restores the conversation.

2. **"Summarize" action in ChatDetailScreen**

   A toolbar action in the chat detail screen generates a note from the conversation. The AI summarizes the chat's key points, decisions, and action items into a structured note. The note is created with a link back to the source chat (using Stage 2 cross-linking).

   - The action is available in the chat toolbar menu (alongside the existing search and review actions).
   - After creation, a toast confirms "Summary saved" with a "View" action.
   - The chat detail screen shows a banner: "Summarized as [Note Title] →."

3. **Expanded inbox item for conversational notes**

   In the merged inbox, a note that has an active chat thread shows a second row preview below the main row — a snippet of the latest chat message, indented, with a reply count. Tapping the note row opens the note (as today). Tapping the chat snippet opens the note directly to the chat panel (deep link into the chat state).

   This makes conversational notes visually distinct in the feed without requiring the user to open the note to know there's a discussion attached.

4. **Chat detail screen shows linked note artifact**

   When a chat has a linked note (from "Summarize" or from Stage 2 "Save as note"), the chat detail screen header shows the note title. Tapping it pushes the note detail screen. The chat's messages and the note's content are connected but independently navigable.

### Technical changes

**Database** — additive migration:

```sql
-- A note can optionally own a chat thread for inline discussion
ALTER TABLE app.notes ADD COLUMN chat_id uuid REFERENCES app.chats(id) ON DELETE SET NULL;

-- A chat can optionally produce a note artifact (summary)
ALTER TABLE app.chats ADD COLUMN note_id uuid REFERENCES app.notes(id) ON DELETE SET NULL;
```

- `notes.chat_id`: when set, this note has an inline chat thread. The chat is scoped to this note — it has no independent inbox presence (hidden from the main feed, accessed only through the note).
- `chats.note_id`: when set, this chat produced a note artifact (summary). The note has its own inbox presence and is linked back to the chat.
- Both are nullable with `ON DELETE SET NULL` — deleting the chat unlinks the note's inline thread (the note survives), deleting the note unlinks the chat's artifact reference (the chat survives).

**Relationship to Stage 2 `content_links`**: `notes.chat_id` and `chats.note_id` are direct ownership references (this note owns this chat, this chat produced this note). `content_links` remains for bidirectional general-purpose linking (e.g., a note that references another note). Use direct columns for ownership, join table for cross-references. If this becomes confusing, drop `content_links` entirely in favor of the direct columns — Stage 2 is additive and easy to unwind.

**API**:

- `GET /api/inbox` — add `chatPreview?: { messageCount: number, lastMessage: string }` to note items when `notes.chat_id IS NOT NULL`. The client renders the nested chat preview row.
- `GET /api/inbox/note/:id` — return `chatId` if the note has an inline thread. The client uses this to fetch and render the chat panel.
- `GET /api/inbox/chat/:id` — return `noteId` and `noteTitle` if the chat has a linked artifact.
- `POST /api/inbox/note/:id/discuss` — creates a scoped chat and sets `notes.chat_id`. Returns the `chatId`.
- `POST /api/inbox/chat/:id/summarize` — calls AI to generate a note summary, creates the note, sets `chats.note_id`, creates a `content_links` row. Returns the `noteId`.

**Client**:

- `ChatPanel` — a new component wrapping the existing `ChatDetailScreen` message list in a resizable bottom sheet. Consumes a `noteId` for context injection. Shares the same `useChatMessages` hook but scoped to the note's chat.
- `NoteDetailScreen` — gains the `ChatPanel` component. A `chatPanelVisible` state toggles the sheet. The note's content is passed as context when opening the chat.
- `ChatDetailScreen` — gains the "Summarize" toolbar action and the linked note banner.
- `InboxStreamItem` — gains the nested chat preview row for notes with active discussions.
- `useCreateDiscussChat(noteId)` — wraps `POST /api/inbox/note/:id/discuss`.
- `useSummarizeChat(chatId)` — wraps `POST /api/inbox/chat/:id/summarize`.

### What does NOT change

- `ChatDetailScreen` and `NoteDetailScreen` remain separate components with their own layouts. The chat panel is additive, not a rewrite.
- The main inbox feed — chat items without a linked note render identically to today.
- The Time workspace.
- Composer and creation flow.

## Risks

- **Chat panel performance**: rendering a full chat inside a resizable sheet on top of a rich text editor is a heavy composition. Mitigation: the chat panel uses `FlashList` (already optimized for message rendering). The note editor pauses expensive operations (AI enhance, Markdown preview regeneration) while the chat panel is open. Test on iPhone SE (smallest supported device) before shipping.
- **Scoped chat lifecycle**: what happens to the chat when the note is deleted? `ON DELETE SET NULL` means the chat becomes orphaned but not deleted. Mitigation: a background job or a `BEFORE DELETE` trigger on `app.notes` can cascade-delete scoped chats. Or explicitly delete the chat in the note deletion handler. Decision: cascade-delete scoped chats — they have no reason to exist without their note.
- **AI summarize quality**: the generated note from chat summarization may produce low-quality or irrelevant content. Mitigation: the summary is editable. The user can refine it in the note editor after creation. The AI prompt includes the full conversation and instructions to produce a structured note (title, sections, action items).
- **Entity model complexity**: direct columns + a join table for linking creates two linking mechanisms. Mitigation: document the distinction clearly: `chat_id`/`note_id` columns = ownership (this entity was created from that entity), `content_links` = cross-referencing (these entities are related). If this proves unnecessary, collapse into one mechanism post-launch.

## Revert strategy

- Drop `notes.chat_id` and `chats.note_id` columns.
- Remove `ChatPanel` from `NoteDetailScreen` — falls back to the standard note editor.
- Remove "Summarize" from `ChatDetailScreen` — falls back to the current chat-only experience.
- Remove chat preview rows from inbox items.
- Remove the four new API endpoints.
- Scoped chats created during this stage become inaccessible (their note reference is gone). They remain in the database but are hidden from the UI. A cleanup migration can delete orphaned scoped chats.

## Success criteria

1. Opening a note and tapping the chat handle reveals a working chat panel with the note's content as AI context.
2. Messages sent in the chat panel persist and restore when reopening the panel.
3. The chat panel can be dismissed and reopened without losing scroll position.
4. "Summarize" from a chat creates a note with a structured summary and a bidirectional link.
5. The merged inbox shows a chat preview row for notes with active discussions.
6. Deleting a note with a scoped chat deletes the chat.
7. The note editor and chat panel coexist without layout jank or performance degradation on the smallest supported device.
