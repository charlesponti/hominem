## Context

The Notes app currently has two separate route trees (`/notes/*`, `/chat/*`) under a shared layout. The sidebar renders typed sections (recent chats, notes list). HyperForm is mounted once in the layout but has no explicit default-mode affordance — it relies on route context implicitly. There is no unified feed of activity across both entity types.

The product goal is a notes-first personal assistant where notes and chats are peers in a single stream. Users should land on that stream, not on a home dashboard or a notes list. The stream is the product.

## Goals / Non-Goals

**Goals:**
- Ship a `/stream` route as the app home that renders a unified chronological feed of notes and chats
- Add a `chat_note_references` relationship so chats can carry note context
- Surface note-picking in HyperForm's chat mode
- Give HyperForm a clear default mode: committed-on-send with "Save as note" / "Start chat" actions
- Replace the sidebar's split-list structure with a single stream navigator

**Non-Goals:**
- Merging notes and chats into a single data model — they remain separate entities
- Changing the note editor or chat conversation UX beyond what's needed for context linking
- Mobile app changes (this change is scoped to `apps/notes`)
- Real-time / push updates to the stream (polling or invalidation on navigation is sufficient)

## Decisions

### 1. Stream as a query, not a new table

The stream is computed at query time by unioning the notes and chats tables with a shared sort key (`updated_at`). No new database table is needed. The API returns a discriminated union `StreamItem = { type: 'note', ...NoteFields } | { type: 'chat', ...ChatFields }`.

**Alternatives considered:**
- *Materialized stream table*: Keeps the query simple but requires write-through maintenance on every note/chat mutation. Premature for current scale.
- *Client-side merge*: Fetch notes and chats separately and merge in the browser. Breaks pagination correctness when the two lists have interleaved timestamps.

### 2. Committed-on-send for HyperForm default mode

In the default mode (no active note or chat), the user types into HyperForm and chooses the action at submit time via two buttons: "Save as note" and "Start chat". No toggle or mode switch before typing.

**Alternatives considered:**
- *Explicit toggle before typing*: Adds friction and requires users to think about mode before they know their intent. The input should be frictionless.
- *Smart inference*: Detect intent from text (question → chat, statement → note). Too unpredictable; wrong inference breaks trust.

### 3. Note references as a join table on Chat

`chat_note_references(chat_id, note_id, added_at)` — a simple join. The chat carries the reference; notes have no awareness of which chats reference them. References are displayed as a context strip above the composer in chat mode.

**Alternatives considered:**
- *Array column on chats*: `referenced_note_ids text[]`. Simpler but loses `added_at` and makes the reverse lookup (which chats reference this note) a full scan.
- *Bidirectional link on Note*: Notes track which chats reference them. Creates tight coupling in the wrong direction; notes should be first-class, self-contained items.

### 4. Sidebar becomes a stream navigator using the same stream query

The sidebar fetches the same `/stream` endpoint (with a smaller `limit`), rendering `StreamSidebarItem` variants for notes and chats. A filter pill allows narrowing to one type. No separate "recent chats" and "notes" sections.

**Alternatives considered:**
- *Keep separate lists, add unified view on top*: Two sources of truth. Any pagination or ordering change must be made twice.

### 5. Route structure: `/stream` as canonical home, `/` redirects

`/stream` is the named home route. Root `/` redirects to `/stream`. The existing `/home` route redirects to `/stream`. This preserves any bookmarks and avoids a root-level catch-all.

## Risks / Trade-offs

- **Stream query performance at scale**: A UNION of notes + chats with `ORDER BY updated_at LIMIT n` requires both tables to be indexed on `updated_at`. Add index if not present; monitor query time.
  → *Mitigation*: Add migration to ensure `idx_notes_updated_at` and `idx_chats_updated_at` exist before shipping the endpoint.

- **HyperForm committed-on-send UX ambiguity**: Users may not notice the two action buttons if they habitually press Enter/Return to submit.
  → *Mitigation*: Enter key in default mode opens a small action menu (note / chat) rather than silently choosing. Can be refined post-ship.

- **Sidebar stream navigator removes explicit "chats" and "notes" sections**: Power users who rely on the current typed sections may feel disoriented.
  → *Mitigation*: The filter pill restores the typed view on demand. Ship with the filter defaulting to "All" but persist the user's last selection.

- **Note-picker in HyperForm chat mode adds a new async dependency**: The picker must search notes while the user is composing. If the notes API is slow, it blocks the compose flow.
  → *Mitigation*: Show recent notes immediately (cached from stream data); search is supplemental.

## Migration Plan

1. Add `chat_note_references` migration (additive, no downtime)
2. Add `/stream` API endpoint behind feature flag
3. Ship `/stream` route with feature flag on in staging
4. Redirect `/home` → `/stream` after QA sign-off
5. Update sidebar to stream navigator (flag-gated initially)
6. Ship HyperForm default mode changes last (highest UX risk)
7. Remove feature flags once stable

**Rollback**: Each step is independently reversible. The stream endpoint can be removed; `/home` redirect can be reverted; sidebar changes are isolated to `notes-sidebar.tsx`.

## Open Questions

- Should the stream support infinite scroll or pagination with "Load more"? (Recommendation: cursor-based "Load more" to keep initial load fast and avoid scroll jank.)
- Should note references in a chat be editable after the chat starts, or only addable at the time of creation?
- What is the empty-state design for the stream when a new user has no notes or chats?
