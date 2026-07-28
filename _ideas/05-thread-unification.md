# Stage 5: Full Thread Unification

**Risk: Highest** — v2 re-architecture, full database migration, API rewrite, client refactor. Only commit after Stages 1–4 prove the conceptual merge works.

## Goal

Eliminate the chat/note distinction as a data model concept. Replace both with a single `thread` entity that shifts between conversational and documentary modes based on user behavior. A thread can be a chat, a note, or both at once.

## Scope

This is a directional spec, not a build plan. Each sub-point needs its own design doc before implementation.

### Core concept: The Thread

A thread is a single entity containing:

- **Messages** (the conversational layer) — user messages, AI responses, system prompts.
- **Document** (the documentary layer) — a structured text artifact with title, sections, formatting.
- **Mode** — a derived value (`conversational`, `documentary`, `hybrid`) based on the presence and activity of both layers.

The mode is not user-selected. It is observed from behavior: a thread with only messages is conversational, a thread with only a document is documentary, a thread with both is hybrid. The mode determines the default detail screen layout and the inbox presentation.

### UX (directional)

1. **Unified detail screen**

   One screen: `ThreadDetailScreen`. It contains two panels stacked vertically:
   - Top: the document editor (from today's `NoteDetailScreen`)
   - Bottom: the message list (from today's `ChatDetailScreen`)

   The divider is draggable. In conversational mode, the document panel is collapsed to a thin bar showing only the title (or hidden entirely). In documentary mode, the message panel is collapsed to a thin bar showing the chat entry point. In hybrid mode, both are visible.

2. **Unified compose**

   Single input, single submit. The thread starts in conversational mode. As the user pastes or types long-form content, the document panel appears and the thread shifts to hybrid mode. There is no "kind" decision at any point.

3. **Unified inbox**

   The merged inbox from Stage 1 becomes the only inbox. Threads are sorted by `updatedAt`. A thread's inbox row shows:
   - The thread title (from the document title, or the first message)
   - A mode indicator (icon + subtle color: bubble = conversational, document = documentary, both = hybrid)
   - The latest activity preview (last message text or document snippet, whichever is newer)

4. **Mode transitions are automatic**

   A conversational thread becomes hybrid when the user starts editing the document. A documentary thread becomes hybrid when the user sends a message in the chat panel. A hybrid thread with an empty document collapses to conversational. A hybrid thread with no messages collapses to documentary. The mode is always the truth of the data, not a stored column.

### Database (directional)

```sql
CREATE TABLE app.threads (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text,
    document    text,          -- the full document content (nullable)
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz,
    user_id     uuid NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE app.messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id   uuid NOT NULL REFERENCES app.threads(id) ON DELETE CASCADE,
    role        text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
```

- `app.chats` → absorbed into `app.threads` (title comes from first message or document title).
- `app.notes` → absorbed into `app.threads` (the `document` column replaces the note content).
- `app.content_links` → becomes `thread_id` references or a renamed `app.thread_links`.
- Messages are always children of a thread. A thread can have zero messages (pure documentary) or zero document (pure conversational).
- Migration: existing chats become threads with messages and no document. Existing notes become threads with a document and no messages. Existing cross-links from Stage 2 become `thread_links`.

### API (directional)

- `GET /api/threads` — unified inbox (replaces `GET /api/inbox`). Returns threads with pagination, each thread including `mode`, `latestActivity`, `messageCount`.
- `GET /api/threads/:id` — full thread with messages (paginated) and document.
- `POST /api/threads` — create a thread. Body can include an initial `message` or `document` or both.
- `POST /api/threads/:id/messages` — add a message to a thread (replaces chat send).
- `PATCH /api/threads/:id/document` — update the document (replaces note save).
- `POST /api/threads/:id/link` — cross-link threads (replaces `content_links`).

### Client (directional)

- `ThreadDetailScreen` — replaces both `ChatDetailScreen` and `NoteDetailScreen`. Renders the split-panel layout based on mode.
- `useThread(id)` — single query replacing `useChatMessages` + note fetching.
- `useThreads` — single infinite query replacing `useInboxStreamItems`.
- `ThreadStreamItem` — single inbox row component replacing `InboxStreamItem` + per-kind branching.

### What goes away

- `app.chats` table
- `app.notes` table
- `ChatDetailScreen`
- `NoteDetailScreen`
- `useInboxStreamItems` (replaced by `useThreads`)
- `InboxStreamItem` (replaced by `ThreadStreamItem`)
- All `kind` branching in every component
- `WorkspaceContext` type (`'chats' | 'notes' | 'time'` becomes `'threads' | 'time'`)
- `ContentKind` type and all kind-based routing

## Risks

- **Migration volume**: every chat and note row, every API endpoint, every client component, every type, every test. This is a full rewrite of the inbox layer. Budget: 2–4 weeks of focused work plus a beta period.
- **Data loss risk**: the chat → thread + note → thread migration must preserve all message history, document content, timestamps, and cross-links. Requires a verified migration script with a dry-run mode and rollback path.
- **Regressions**: every feature built on top of chats and notes (search, archive, delete, AI enhance, attachments, review overlay, context menus, onboarding, empty states, analytics events) must be rebuilt on threads. The risk of missing a feature or introducing a subtle behavior change is high.
- **User confusion**: removing the chat/note distinction may disorient users who have a clear mental model of "I chat here, I write here." Mitigation: the mode indicator in the inbox and the split-panel layout in the detail screen preserve the visual distinction even if the data model doesn't. Additionally, this stage should only ship after Stages 1–4 have already accustomed users to a blurred boundary.
- **Performance**: a single detail screen rendering both a document editor and a message list simultaneously is heavier than either screen alone. Mitigation: lazy-load the inactive panel. In conversational mode, the document panel is a thin bar with no editor mounted. In documentary mode, the message list is a thin bar with no `FlashList` mounted.

## Revert strategy

There is no partial revert for Stage 5. Reverting means restoring the pre-Stage-5 state from a database backup and deploying the previous API and client versions. This is a coordinated rollback, not a feature flag toggle.

Mitigation: run Stage 5 as a parallel deployment:

1. Deploy the new thread-based API at `/api/v2/threads` alongside the existing `/api/inbox`.
2. Deploy the new client behind a feature flag (`ENABLE_THREADS_V2`).
3. Run both systems in production for a beta period (invite-only or internal).
4. Migrate users gradually. Keep the old tables alive until the migration is verified.
5. Once stable, cut over and deprecate the v1 endpoints.

## Success criteria

1. All existing chat conversations survive the migration as threads with messages and zero document.
2. All existing notes survive the migration as threads with a document and zero messages.
3. Creating a new thread and sending a message works identically to creating a chat today.
4. Creating a new thread and editing the document works identically to creating a note today.
5. A thread that starts as a chat can accumulate document content without mode switching being a user action.
6. A thread that starts as a note can accumulate messages without mode switching being a user action.
7. The merged inbox renders all threads sorted by `updatedAt` with correct mode indicators.
8. All Stage 1–4 features (cross-linking, smart creation, conversational notes) survive the migration or are rebuilt on the thread model.
9. Zero data loss verified by row counts before and after migration.
10. Existing deep links and route patterns redirect correctly to thread equivalents.
