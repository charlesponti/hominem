## Why

The Notes app currently treats notes and chats as separate route trees with separate navigation, but the product vision is a notes-first personal assistant where both exist in a single activity stream. The bifurcated architecture forces users to navigate between two conceptual spaces instead of experiencing one coherent place where they capture and converse.

## What Changes

- **NEW**: A unified stream route (`/stream` or `/`) as the app home — a single chronological feed of `Note` and `Chat` items rendered as typed cards
- **NEW**: Note-as-context linking — chats can reference one or more notes to provide context; notes do not own chats
- **MODIFIED**: HyperForm default mode gains two explicit affordances: create a note or start a new chat (committed-on-send pattern)
- **MODIFIED**: Sidebar becomes a stream navigator — a single chronological list of mixed-type items, replacing the current split "recent chats" + notes sections
- **MODIFIED**: Stream route is the new home base; `/home` redirects to `/stream`

## Capabilities

### New Capabilities

- `unified-stream`: The stream route — a single scrollable feed of `Note | Chat` items, sorted by `updatedAt`, with a shared card anatomy for both types. This is the app's home base and default landing surface.
- `note-chat-context-linking`: The ability for a chat to reference one or more notes as context. Includes the note-picker affordance in HyperForm's chat mode and the data model to store/resolve references.

### Modified Capabilities

- `notes-chat-surface`: Sidebar nav changes from a category browser (two typed lists) to a unified stream navigator (one chronological mixed-type list with optional type filter). The `/home` route is replaced by `/stream`.
- `universal-composer`: HyperForm gains an explicit default mode: when no chat or note is active, the form presents two send affordances — "Save as note" and "Start chat" — using a committed-on-send pattern (user types first, chooses action on submit).

## Impact

- `apps/notes/app/routes/` — new `/stream` route; `/home` becomes a redirect
- `apps/notes/app/components/notes-sidebar.tsx` — stream navigator replaces dual-list sidebar
- `apps/notes/app/routes/layout.tsx` — stream content mode added; HyperForm receives mode context
- `packages/hono-rpc/src/routes/` — stream query endpoint (unified note+chat feed); chat routes updated to accept `referencedNotes`
- `packages/hono-client/src/domains/` — stream domain client; chat domain updated
- `packages/db/` — `chat_note_references` join table migration
- `packages/ui/src/` — `StreamCard`, `NoteCard`, `ChatCard` primitives; stream content mode token
