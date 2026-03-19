# Notes App — Focus-First Layout Plan

**Last updated:** 2026-03-19
**Status:** Active

---

## Product vision

A notes-first personal assistant where notes and chats exist as a **single unified feed**. The HyperForm is the always-present, context-aware entry point — it creates a note, starts a chat, or continues the active chat depending on where the user is.

---

## Core data model

```
Stream
  ├── Note   { id, content, createdAt, updatedAt, tags[] }
  └── Chat   { id, messages[], referencedNotes: NoteId[], createdAt, updatedAt }
```

- Notes and chats are **independent first-class items** — no ownership hierarchy.
- A chat may reference one or more notes as LLM context. This is a chat-side relationship only.
- The feed is sorted by `updatedAt` descending. Editing a note or sending a chat reply both bump their item to the top.

---

## Route → HyperForm mode

| Route | Mode | HyperForm behaviour |
|---|---|---|
| `/` | **default** | Free-text input. On send, inline type selector appears: **Note** or **Chat**. |
| `/chat/:chatId` | **chat** | Input continues the active chat. Note picker available to attach context. |
| `/notes/:noteId` | **note** | HyperForm collapses; note editor is the primary surface. |

### Committed-on-send (default mode)

The user types freely. Pressing send or `Enter` reveals a two-option inline control — **Save as note** / **Start chat** — directly beneath the input. No pre-typing toggle. Intent is committed at the moment of send, not before.

---

## Design system alignment

### Token references

All implementation must use tokens from `@hominem/ui/tokens`. Never hardcode values.

| Role | Token | Resolved value |
|---|---|---|
| Feed background | `notesSurfaces.page` → `colors['bg-base']` | `#ffffff` |
| Item hover | `notesStream.itemHover` → `colors['bg-surface']` | `#f5f5f7` |
| Item border | `notesStream.itemBorder` → `colors['border-subtle']` | `rgba(0,0,0,0.05)` |
| Item radius | `notesStream.itemRadius` → `radii.lg` | `14px` |
| Item padding X | `notesStream.itemPaddingX` → `spacing[5]` | `20px` |
| Item padding Y | `notesStream.itemPaddingY` → `spacing[4]` | `16px` |
| Item gap | `notesStream.itemGap` → `spacing[1]` | `4px` |
| Panel radius | `notesRadii.panel` → `radii.xl` | `20px` |
| Sidebar background | `colors['sidebar']` | `#f9f9f9` |
| Sidebar border | `colors['sidebar-border']` | `rgba(0,0,0,0.08)` |
| Stream item title | `notesTypography.noteTitle` | `heading-4` |
| Stream item preview | `notesTypography.noteBody` | `body-2` |
| Timestamp | `notesTypography.timestamp` | `body-4` |
| Max content width | `NOTES_MAX_WIDTH` | `768px` |

### Animation mandate

**All web interactive animations MUST use GSAP via `@hominem/ui/lib/gsap`.**

CSS `void-anim-*` classes (`animations.css`) are reserved for Radix UI component enter/exit only. Do not add new CSS keyframe animations for product surfaces.

| Interaction | Sequence | Import |
|---|---|---|
| HyperForm mounts | `playFocusExpand` | `@hominem/ui/lib/gsap` |
| HyperForm closes | `playFocusCollapse` | `@hominem/ui/lib/gsap` |
| Mode switches (default → chat, etc.) | `playContextSwitch` | `@hominem/ui/lib/gsap` |
| Form submit | `playSubmitPulse` | `@hominem/ui/lib/gsap` |
| Focus row enters DOM | `playEnterRow` | `@hominem/ui/lib/gsap` |
| Focus row removed | `playExitRow` | `@hominem/ui/lib/gsap` |
| Skeleton / loading state | `playShimmer` (returns tween — kill on resolve) | `@hominem/ui/lib/gsap` |

Motion timing constants live in `packages/ui/src/tokens/motion.ts`:
- `durations.enter` = 150ms
- `durations.exit` = 120ms
- `translateDistances.enterY` = 6px

---

## What is already done

| Item | Location | Status |
|---|---|---|
| `notesStream` tokens | `packages/ui/src/tokens/notes.ts` | ✅ exists |
| GSAP mandate documented | `packages/ui/src/tokens/motion.ts` | ✅ exists |
| GSAP canonical sequences | `packages/ui/src/lib/gsap/sequences.ts` | ✅ exists |
| `gsap` dependency | `packages/ui/package.json` | ✅ added |
| `@hominem/ui/lib/gsap` export | `packages/ui/package.json` | ✅ added |

---

## Phases

### Phase 0 — Focus route and feed

**Goal:** `/` renders a unified scrollable feed of notes + chats.

**API**
- Add `GET /focus` to `packages/hono-rpc/src/routes/focus.ts`
  - Union query: notes + chats, sorted by `updatedAt` DESC, cursor-paginated
  - Response shape: `{ items: FocusItem[], nextCursor: string | null }`
  - `FocusItem` discriminated union: `{ type: 'note', ...NoteFields } | { type: 'chat', ...ChatFields }`

**Client**
- Create `apps/notes/app/routes/_layout.focus.tsx` as the `/` index route
- `useInfiniteQuery` against `/focus`; `IntersectionObserver` sentinel triggers next page
- Skeleton rows on load: `playShimmer` on each skeleton element; kill tween on data resolve
- New rows entering: `playEnterRow(el, index * 0.04)` for a staggered cascade

**Components**
- `apps/notes/app/components/focus/focus-item.tsx` — discriminated switch: `NoteStreamItem | ChatStreamItem`
- `apps/notes/app/components/focus/note-focus-item.tsx`
  - Title: `notesTypography.noteTitle`
  - Preview: first 120 chars, `notesTypography.noteBody`
  - Tags: badge pills, `notesRadii.badge`
  - Timestamp: `notesTypography.timestamp`
- `apps/notes/app/components/focus/chat-focus-item.tsx`
  - Last message preview
  - Referenced note count badge
  - Timestamp

**Tokens used:** `notesStream.*`, `notesSurfaces.page`, `notesBorders.divider`, `notesTypography.*`

---

### Phase 1 — HyperForm mode switching

**Goal:** HyperForm knows its mode from the route and animates all transitions via GSAP.

**Hook**
- `apps/notes/app/hooks/use-hyper-form-mode.ts`
- `HyperFormMode = 'default' | 'chat' | 'note'`
- Derived from `useMatch`: `/chat/:chatId` → `'chat'`, `/notes/:noteId` → `'note'`, `/` → `'default'`
- No component state — pure route derivation

**Default mode behaviour**
- Input renders with placeholder: "Write a note or start a chat…"
- On `Enter` / send: show `NoteAction | ChatAction` inline selector beneath input
- Selecting **Note**: calls `notes.create`, clears form, `playSubmitPulse`
- Selecting **Chat**: calls `chats.create`, navigates to `/chat/:newId`

**Chat mode behaviour**
- Input wires to `useChat` for the active `chatId`
- Note picker button in the toolbar (Phase 2)
- No type selector

**Note mode behaviour**
- HyperForm collapses via `playFocusCollapse`; note editor is full surface

**Transitions**
- Route change triggers mode switch: `playContextSwitch` on placeholder/label swap
- HyperForm mount: `playFocusExpand`

---

### Phase 2 — Note-as-context in chat

**Goal:** Users can attach notes as LLM context when composing a chat message.

**Data**
- Add `referencedNotes: string[]` to `Chat` schema
- `PATCH /chats/:chatId` accepts `referencedNotes` updates
- API resolves note content server-side when building LLM context window

**UI**
- `apps/notes/app/components/hyper-form/note-picker-sheet.tsx`
  - Bottom sheet; searchable note list; multi-select
  - Selected notes held in local state, passed to submit payload
- Context strip above HyperForm input in chat mode: pill per attached note, with remove button
- In chat transcript: referenced notes render as a compact context block (title + icon) above the assistant reply, collapsed by default

---

### Phase 3 — Sidebar as focus navigator

**Goal:** The sidebar is a single chronological navigator, not two typed lists.

**Changes to `apps/notes/app/components/notes-sidebar.tsx`**
- Remove "Recent Chats" and "Notes" sections
- Replace with `SidebarStreamItem` list: shared chronological feed from the same `/focus` query (first page, no pagination in sidebar)
- Filter pills at top: **All | Notes | Chats** — client-side filter, no re-fetch
- Active item: `colors['sidebar-accent']` background, `colors['sidebar-accent-foreground']` text
- New items stagger in: `playEnterRow(el, index * 0.04)`
- Remove "View all chats →" and "View all notes →" links — the focus is the full list

**New component**
- `apps/notes/app/components/focus/sidebar-focus-item.tsx`
  - Type icon (note or chat), title (truncated), relative timestamp

---

### Phase 4 — Layout and token cleanup

**Goal:** Remove content-mode divergence; align layout to focus-first model.

**Layout**
- Remove `full-bleed` / `default` content mode switching from the notes layout shell
- Focus route (`/`): full-height, no max-width on feed column, sidebar + feed two-column
- Note detail (`/notes/:noteId`): `NOTES_MAX_WIDTH` (768px) centered, HyperForm hidden
- Chat (`/chat/:chatId`): full-height, `NOTES_MAX_WIDTH` message column, HyperForm pinned at bottom

**HyperForm animation migration**
- `apps/notes/app/components/hyper-form/animations.ts`: replace local `playSubmitPulse` and `playContextSwitch` with imports from `@hominem/ui/lib/gsap`
- Delete the local implementations once imported; retain `playEntry` → rename to `playFocusExpand` call

**CSS cleanup**
- Audit and remove all `pb-composer` CSS variable fallback hacks
- Remove any hardcoded `duration` or `ease` strings in component files — use `durations.*` and `easingWeb.*` from `motion.ts`

---

## Files to create or modify

### New
| File | Purpose |
|---|---|
| `apps/notes/app/routes/_layout.focus.tsx` | Focus index route |
| `apps/notes/app/components/focus/focus-item.tsx` | Discriminated focus item |
| `apps/notes/app/components/focus/note-focus-item.tsx` | Note row |
| `apps/notes/app/components/focus/chat-focus-item.tsx` | Chat row |
| `apps/notes/app/components/focus/sidebar-focus-item.tsx` | Sidebar row |
| `apps/notes/app/components/hyper-form/note-picker-sheet.tsx` | Note context picker |
| `apps/notes/app/hooks/use-hyper-form-mode.ts` | Route → mode derivation |
| `packages/hono-rpc/src/routes/focus.ts` | Unified focus API route |

### Modify
| File | Change |
|---|---|
| `apps/notes/app/components/hyper-form/animations.ts` | Import from `@hominem/ui/lib/gsap`; remove local duplicates |
| `apps/notes/app/components/notes-sidebar.tsx` | Replace typed sections with focus navigator |
| `packages/hono-rpc/src/routes/chats.ts` | Add `referencedNotes` field |

---

## Out of scope

- Mobile app focus (separate plan; mobile uses Expo tabs)
- Dark mode token additions
- Note collaboration / sharing
- Full-text search infrastructure (filter pills use existing note search)
- Desktop app
