# Stage 2: Cross-Linking

**Risk: Medium** — additive DB columns and new actions, no existing data migration, no existing UX changes.

## Goal

Allow a chat to be promoted into a note and a note to spawn a discussion chat. Connected items show bidirectional links in the inbox and detail screens.

## Scope

### UX changes

1. **"Save as note" in ChatDetailScreen**

   A toolbar action (or long-press on the chat header) extracts the entire conversation into a new note. The note's content is a plain-text concatenation of all messages (role-labeled: "You:" / "Omiro:"). After creation, a toast confirms "Saved as note" with a "View" action that pushes the new note's detail screen. The chat detail screen shows a subtitle or banner: "Saved as note · 2m ago."

2. **"Discuss" in NoteDetailScreen**

   A toolbar action creates a chat scoped to this note. The chat opens immediately — the note's title becomes the chat title, and the note's full text is injected as the first AI context (hidden system message). The note detail screen shows a subtitle or banner: "Discussion thread · 3 messages."

3. **Linked item indicators in the merged inbox**

   An inbox row for a linked item shows a secondary label:

   - Chat saved as note: subtitle reads "Note · 2h ago" with a document icon
   - Note with discussion: subtitle reads "Discussion · 1h ago" with a chat bubble icon

   Tapping the subtitle navigates to the linked item.

4. **Linked item banner on detail screens**

   Both `ChatDetailScreen` and `NoteDetailScreen` show a compact banner below the header when a link exists:
   - Chat detail: "Saved as [Note Title] →" (tappable, pushes the note)
   - Note detail: "Discussion: [Chat Preview] →" (tappable, pushes the chat)

### Technical changes

**Database** — additive migration, one new table:

```sql
CREATE TABLE app.content_links (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_kind text NOT NULL CHECK (source_kind IN ('chat', 'note')),
    source_id   uuid NOT NULL,
    target_kind text NOT NULL CHECK (target_kind IN ('chat', 'note')),
    target_id   uuid NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (source_kind, source_id, target_kind, target_id)
);
```

- `source_kind` + `source_id` identifies the item that initiated the link (e.g., the chat being saved).
- `target_kind` + `target_id` identifies the linked item (e.g., the resulting note).
- Both directions are queryable. No foreign keys with CASCADE — links survive if either item is deleted (renders as "Deleted item" in the UI).
- Two indexes: one on `(source_kind, source_id)` for "what links does this item have," one on `(target_kind, target_id)` for "what links point to this item."

**API** — additive, two new endpoints:

1. `POST /api/content/:kind/:id/link` — body: `{ targetKind, targetId }`. Creates a link row. Idempotent (UNIQUE constraint handles duplicates).
2. `GET /api/content/:kind/:id/links` — returns all links for an item (both directions), with enough data to render the banner (title, preview, kind).

**Existing endpoint changes**:

- `GET /api/inbox` — add an optional `links` field to `InboxStreamItem`. When present, the client renders the subtitle with the linked item's title. Only included when the item has links (most items won't).
- `GET /api/inbox/[kind]/[id]` — return linked item metadata for the detail screen banners.

**Client**:

- `useContentLinks(kind, id)` — a `useQuery` hook fetching links for a detail screen. Returns `{ sourceLinks, targetLinks }`.
- `useCreateLink` — mutation for "Save as note" flow: creates the note, then creates the link.
- `InboxStreamItem` — renders linked item subtitle when `item.links` is present.
- `ChatDetailScreen` — "Save as note" toolbar button, link banner.
- `NoteDetailScreen` — "Discuss" toolbar button, link banner.

### What does NOT change

- The chat and note entity models remain separate tables with no cross-FK constraints.
- The inbox API shape is backward-compatible — `links` is optional, clients ignoring it see no difference.
- Detail screen layouts — the banner is additive, pushed below the header.

## Risks

- **Orphaned links**: deleting a linked item without cleaning up `content_links` rows creates dead references. Mitigation: the API resolves linked item titles at query time; deleted items render as "Deleted" in the banner. A background job (or ON DELETE trigger) can clean up orphaned links later.
- **Cycles**: A chat → note → chat chain could create a loop. Mitigation: the link banner only shows one level deep; no recursive resolution. The UI is a flat "this is linked to that," not a graph explorer.
- **Migration volume**: `content_links` starts empty. No existing data needs backfill.

## Revert strategy

- Drop the `content_links` table.
- Remove the two API endpoints.
- Remove the "Save as note" and "Discuss" buttons from detail screens.
- Remove the `links` field from inbox responses.
- Linked items remain as independent entities — no data corruption from removing the link layer.

## Success criteria

1. "Save as note" from a chat creates a note with the conversation text and a bidirectional link.
2. "Discuss" from a note creates a chat with the note as context and a bidirectional link.
3. The merged inbox shows linked item subtitles with correct kind icons and navigation.
4. Detail screens show link banners that navigate to the linked item.
5. Deleting a linked item does not crash the other item's detail screen.
6. Both directions of a link are queryable and render correctly.
