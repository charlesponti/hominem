# Notes Stream Architecture Plan

**Date:** 2026-03-19
**Status:** Active

## Product Vision

A notes-first personal assistant where notes and chats exist in a single unified stream. The HyperForm is the hyper-powered entry point: context-aware, always present, always ready to create a note or continue a conversation depending on where the user is.

## Core Model

```
Stream
  ├── Note   { id, content, createdAt, updatedAt, tags[] }
  └── Chat   { id, messages[], referencedNotes: NoteId[], createdAt, updatedAt }
```

- Notes and chats are independent, first-class stream items. No ownership hierarchy.
- A chat references zero or more notes as context. This is a chat-side relationship only.
- The stream is sorted by `updatedAt` descending. A chat reply bumps a chat; a note edit bumps a note.

## Route → HyperForm Mode

| Route | Mode | HyperForm behavior |
|---|---|---|
| `/` (stream) | **default** | Two affordances via committed-on-send: type → choose note or chat |
| `/chat/:chatId` | **chat** | Input continues the active chat. Note picker available for context. |
| `/notes/:noteId` | **note** | HyperForm collapses; note editor is the primary surface. |

### Committed-on-send pattern (default mode)

The user types freely. On send, a two-option control appears inline (note / start chat). No pre-typing toggle. This keeps the input surface minimal until intent is needed.

## Design System Alignment

### Tokens in use

- **Colors:** `bg-base`, `bg-surface`, `bg-elevated`, `sidebar`, `sidebar-border`, `border-default`
- **Motion:** `durations.enter` (150ms), `durations.exit` (120ms), `translateDistances.enterY` (6px)
- **Radii:** `radii.xl` for panels, `radii.lg` for feed items
- **Typography:** `heading-4` for stream item titles, `body-2` for previews, `body-4` for timestamps

### Animation mandate

All new interactive animations MUST use GSAP via `@hominem/ui/lib/gsap`.
CSS `void-anim-*` classes remain for Radix component enter/exit only.

| Interaction | Sequence | Source |
|---|---|---|
| HyperForm opens | `playFocusExpand` | `@hominem/ui/lib/gsap` |
| HyperForm closes | `playFocusCollapse` | `@hominem/ui/lib/gsap` |
| Mode switches (default → chat, etc.) | `playContextSwitch` | `@hominem/ui/lib/gsap` |
| Submit | `playSubmitPulse` | `@hominem/ui/lib/gsap` |
| Stream row enters DOM | `playEnterRow` | `@hominem/ui/lib/gsap` |
| Stream row removed | `playExitRow` | `@hominem/ui/lib/gsap` |
| Skeleton loading | `playShimmer` | `@hominem/ui/lib/gsap` |

---

## Phases

### Phase 0 — Stream foundation

**Goal:** The stream route exists and renders a unified feed of notes + chats.

Tasks:
- Add `GET /stream` API endpoint: union query of notes + chats, sorted by `updatedAt`, paginated
- Create `/` stream route in `apps/notes/app/routes/`
- Build `StreamItem` component: renders `NoteStreamItem` or `ChatStreamItem` based on item type
- `NoteStreamItem`: title, preview (first 120 chars), timestamp, tags
- `ChatStreamItem`: last message preview, participant count, referenced note count, timestamp
- Add `stream` surface to `notesTokens` in `packages/ui/src/tokens/notes.ts`
- Stream scrolls infinitely; skeleton rows use `playShimmer` on load
- New rows entering the DOM use `playEnterRow`

Tokens:
```
surface: colors['bg-base']
itemBorder: colors['border-subtle']
itemHover: colors['bg-surface']
itemRadius: radii.lg
itemPaddingX: spacing[5]
itemPaddingY: spacing[4]
itemGap: spacing[1]
```

---

### Phase 1 — HyperForm mode switching

**Goal:** HyperForm knows which mode it's in and animates transitions correctly.

Tasks:
- Define `HyperFormMode = 'default' | 'chat' | 'note'`
- Derive mode from route: `useHyperFormMode()` hook reads `useMatch` from react-router
- **Default mode:** render input + committed-on-send type selector
  - On `Enter` or send button press, show inline `NoteAction | ChatAction` choice
  - Selecting note: calls `notes.create`, clears form, `playSubmitPulse`
  - Selecting chat: calls `chats.create`, navigates to `/chat/:newId`
- **Chat mode:** input wires to `useChat` for the active chat. No type selector.
  - Note picker button in toolbar: opens note search sheet, appends `referencedNotes`
- Mode transition animation: `playContextSwitch` on label/placeholder swap
- HyperForm entry on mount: `playFocusExpand`

---

### Phase 2 — Note-as-context in chat

**Goal:** Users can attach notes as context when composing a chat message.

Tasks:
- Add `referencedNotes: string[]` to `Chat` schema and API
- Build `NotePickerSheet`: search/filter notes, multi-select, renders as bottom sheet
- Context strip above HyperForm in chat mode: shows attached note titles with remove buttons
- On submit, `referencedNotes` sent with message payload
- In chat transcript, referenced notes render as a compact context block above the assistant reply
- API resolves note content server-side when building the LLM context

---

### Phase 3 — Sidebar as stream navigator

**Goal:** Sidebar reflects the unified stream, not two separate typed lists.

Tasks:
- Replace `NotesSidebar` sections ("Recent Chats" + "Notes") with a single chronological list
- Each sidebar item is a `SidebarStreamItem`: icon (note or chat), title, relative timestamp
- Filter bar at top: All | Notes | Chats (pills, not separate sections)
- Active item highlighted with `bg-surface` background
- New items animate in with `playEnterRow(el, 0.04 * index)` for stagger
- Remove "View all chats →" and "View all notes →" links — stream is the full list

---

### Phase 4 — Layout and token cleanup

**Goal:** Remove content mode divergence; align layout tokens with stream-first model.

Tasks:
- Remove `full-bleed` vs `default` content mode switching from the notes layout
- Stream route: full-height, no max-width constraint, sidebar + feed two-column
- Note detail (`/notes/:noteId`): `NOTES_MAX_WIDTH` (768px) centered, HyperForm hidden
- Chat (`/chat/:chatId`): full-height, `NOTES_MAX_WIDTH` message column, HyperForm at bottom
- Migrate `apps/notes/app/components/hyper-form/animations.ts` to import from `@hominem/ui/lib/gsap` and delete local copies of `playSubmitPulse` and `playContextSwitch`
- Audit and remove any `pb-composer` CSS variable fallback hacks

---

## Files to create or modify

### New files
- `apps/notes/app/routes/_layout.stream.tsx` — stream route
- `apps/notes/app/components/stream/stream-item.tsx`
- `apps/notes/app/components/stream/note-stream-item.tsx`
- `apps/notes/app/components/stream/chat-stream-item.tsx`
- `apps/notes/app/components/stream/sidebar-stream-item.tsx`
- `apps/notes/app/components/hyper-form/note-picker-sheet.tsx`
- `apps/notes/app/hooks/use-hyper-form-mode.ts`
- `packages/hono-rpc/src/routes/stream.ts` — unified stream API route

### Files to modify
- `packages/ui/src/tokens/notes.ts` — add `stream` surface tokens
- `packages/ui/src/tokens/motion.ts` — add GSAP mandate note
- `apps/notes/app/components/hyper-form/animations.ts` — migrate to `@hominem/ui/lib/gsap`
- `apps/notes/app/components/notes-sidebar.tsx` — replace typed sections with stream navigator
- `packages/hono-rpc/src/routes/chats.ts` — add `referencedNotes` field

---

## Out of scope

- Mobile app stream (separate plan; mobile uses Expo tabs model)
- Dark mode token additions
- Note collaboration / sharing
- Full-text search infrastructure (filter bar uses existing search, not new indexing)
