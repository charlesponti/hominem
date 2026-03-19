## 1. Database

- [ ] 1.1 Add migration: `chat_note_references(chat_id, note_id, added_at)` join table with FK constraints and indexes
- [ ] 1.2 Add migration: ensure `idx_notes_updated_at` and `idx_chats_updated_at` indexes exist
- [ ] 1.3 Update DB schema types in `packages/db/` to include `chatNoteReferences`

## 2. Stream API Endpoint

- [ ] 2.1 Add `GET /stream` route in `packages/hono-rpc/src/routes/` returning discriminated union `StreamItem[]` sorted by `updated_at`
- [ ] 2.2 Implement cursor-based pagination on the stream endpoint (`cursor` + `limit` params)
- [ ] 2.3 Add `?type=note|chat` filter support to the stream endpoint
- [ ] 2.4 Add `referencedNotes` field to chat create/update routes in hono-rpc
- [ ] 2.5 Rebuild hono-rpc package (`bun run clean && bun run build`)
- [ ] 2.6 Add `stream` domain client in `packages/hono-client/src/domains/stream.ts`
- [ ] 2.7 Add `chatNoteReferences` methods to the chat domain client

## 3. Stream Route

- [ ] 3.1 Create `apps/notes/app/routes/stream.tsx` — stream route with `StreamFeed` component
- [ ] 3.2 Add `stream` content mode to layout in `apps/notes/app/routes/layout.tsx`
- [ ] 3.3 Add redirect from `/` → `/stream` in root route
- [ ] 3.4 Add redirect from `/home` → `/stream` in the home route

## 4. Stream UI Primitives

- [ ] 4.1 Create `NoteStreamCard` component in `packages/ui/src/` — title, body excerpt, timestamp, note type indicator
- [ ] 4.2 Create `ChatStreamCard` component in `packages/ui/src/` — title/last-message excerpt, timestamp, message count, chat type indicator
- [ ] 4.3 Create `StreamFeed` component in `apps/notes/app/components/` — renders paginated list of `StreamItem[]` using card variants
- [ ] 4.4 Implement empty state for `StreamFeed` (single empty state, points user to HyperForm)
- [ ] 4.5 Implement "Load more" affordance in `StreamFeed` using cursor pagination

## 5. Sidebar Stream Navigator

- [ ] 5.1 Refactor `apps/notes/app/components/notes-sidebar.tsx` to fetch from `/stream` instead of separate notes/chats queries
- [ ] 5.2 Replace split "recent chats" + notes sections with a single `StreamSidebarItem` list
- [ ] 5.3 Add type-filter pill (All / Notes / Chats) to the sidebar header
- [ ] 5.4 Persist the user's last filter selection in session storage
- [ ] 5.5 Highlight the active item in the sidebar based on current route

## 6. HyperForm Default Mode

- [ ] 6.1 Add `default` mode to HyperForm — renders when route is `/stream` or no active context
- [ ] 6.2 Implement committed-on-send action footer: "Save as note" and "Start chat" buttons
- [ ] 6.3 Implement Enter-key action menu in `default` mode (presents "Save as note" / "Start chat" options)
- [ ] 6.4 Wire "Save as note" action to create a note and invalidate the stream query
- [ ] 6.5 Wire "Start chat" action to create a chat session and navigate to `/chat/$newChatId`
- [ ] 6.6 Update HyperForm mode-switching logic: `/stream` → `default`, `/notes/$id` → `note-aware`, `/chat/$id` → `chat-continuation`

## 7. Note-Context Linking in HyperForm

- [ ] 7.1 Create `NotePicker` component — modal/popover with recent notes list and search input
- [ ] 7.2 Add "Add note context" affordance to HyperForm footer in `chat-continuation` and `default` (start-chat path) modes
- [ ] 7.3 Render selected notes as dismissible chips in HyperForm Region 1 (context strip)
- [ ] 7.4 Pass selected note IDs as `referencedNotes` when creating or continuing a chat
- [ ] 7.5 Render note context strip in the chat route header when `referencedNotes` is non-empty

## 8. CSS / Token Cleanup (deferred from previous plan)

- [ ] 8.1 Add `@utility pb-composer` with correct `112px` fallback to `packages/ui/src/styles/globals.css`
- [ ] 8.2 Replace all ad-hoc `pb-[var(--hyper-form-resting-height,72px)]` usages with `pb-composer`
- [ ] 8.3 Add `stream` content mode styles to the layout (full-height, single-column, item-gap)
