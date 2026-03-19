# Notes App Layout Plan

> Analysis date: 2026-03-18
> Scope: `apps/notes/` · `packages/ui/src/`

---

## Current Architecture

### Layout Hierarchy

```
root.tsx (HTML shell + providers)
  └─ routes/layout.tsx          AppLayout + SidebarProvider
      ├─ NotesSidebar           Collapsible, 16rem desktop / offcanvas mobile
      ├─ SidebarInset → <main>  Content area, two modes
      ├─ HyperForm              Sticky composer, pinned bottom
      └─ Toaster
          ├─ routes/notes/layout.tsx
          ├─ routes/chat/layout.tsx
          └─ routes/home, account, settings…
```

### Content Modes

| Route | Mode | Behavior |
|---|---|---|
| `/chat/$chatId` | `full-bleed` | No padding, full width |
| `/notes/*` | `default` | Max-width constrained |
| `/home`, `/account` | `default` | Standard padded |

### Chat Layout Stack

```
div.flex.h-dvh.flex-col.pb-[--hyper-form-resting-height]
  ChatHeader          sticky, backdrop-blur
  div.flex-1.overflow-hidden
    ChatMessages      virtual scroll at 50+ msgs, max-w-[768px]
  ClassificationReview  conditional
HyperForm             fixed bottom, calc(env(safe-area-inset-bottom) + 112px)
```

---

## Identified Issues

### 1. Duplicated Composer Clearance

`pb-[var(--hyper-form-resting-height,72px)]` is hard-coded in multiple route files. The default fallback `72px` mismatches the actual computed height of `112px`, risking content clipping on first paint before the CSS variable resolves.

**Fix:** Extract to a shared `@utility pb-composer` in `globals.css` that uses the correct fallback, and apply it from a single place in the layout.

### 2. Inconsistent Border/Background Opacity

Border opacities (`/50`, `/60`, `/80`) and background opacities (`/70`, `/80`) are scattered across components without a clear token hierarchy. This creates subtle visual inconsistency between `ChatHeader`, the note editor container, and card borders.

**Fix:** Add opacity steps to the design system token set (`--color-border-default`, `--color-border-muted`, `--color-surface-overlay`) and audit usage across components.

### 3. Search Overlay Positioning

The message search UI in `ChatMessages` uses `absolute inset-x-0 top-4 z-20`. Because it's inside a scroll container, extreme content lengths could cause overlap with the sticky `ChatHeader`.

**Fix:** Hoist the search overlay to the chat route level (sibling to `ChatHeader`), so it's always anchored to the viewport rather than the scroll container.

### 4. Recent Items Hard-Coded Limit

`NotesSidebar` queries `chats.list({ limit: 20 })` with no pagination or infinite scroll. Users with large chat histories see a truncated list with no affordance to load more.

**Fix:** Add a "Show all" link at the bottom of the recent list that navigates to `/chat`, or implement cursor-based infinite scroll in the sidebar using the existing RPC client.

### 5. Missing `data-content-mode` on Note Editor

`/notes/$noteId` manually applies `pb-[--hyper-form-resting-height]` rather than delegating to the layout's `contentMode` prop. This is a one-off deviation from the pattern used by chat routes.

**Fix:** Add a `contentMode` prop or route-level data attribute that the parent layout reads, keeping all routes consistent.

---

## Proposed Improvements

### Phase 1 — Token Cleanup (low risk)

- [ ] Add `--color-border-muted` and `--color-surface-glass` tokens to `globals.css`
- [ ] Add `@utility pb-composer` with correct `112px` fallback
- [ ] Audit all `border-border/*` and `bg-background/*` usages; migrate to tokens
- [ ] Replace ad-hoc `pb-[var(--hyper-form-resting-height,72px)]` with `pb-composer`

### Phase 2 — Layout Correctness (medium risk)

- [ ] Hoist chat search overlay out of scroll container
- [ ] Unify note editor layout to use `contentMode` from parent layout
- [ ] Audit `flex-1 min-h-0` + `overflow-hidden` chain in all scrollable containers

### Phase 3 — Sidebar UX (medium risk)

- [ ] Add "View all chats →" footer link to recent items list
- [ ] Implement cursor-based pagination in sidebar (or virtual scroll for large lists)
- [ ] Consider pinning the most recent note at the top of the sidebar separately from chats

### Phase 4 — Responsive Polish (low-medium risk)

- [ ] Verify mobile tab bar clearance on routes that don't use `HyperForm`
- [ ] Test safe-area inset on notch devices for all sticky/fixed elements
- [ ] Add `md:` breakpoint handling for sidebar toggle visibility in split-view note editor

---

## Design System Alignment

### Chat Tokens (source of truth)

```
chatTokens.transcriptMaxWidth  = 768px
chatTokens.turnGap             = 24px   (--spacing-5)
chatTokens.radii.bubble        = 20px   (--radius-xl)
chatTokens.surfaces.user       = rgba(0,0,0,0.9)
chatTokens.surfaces.assistant  = transparent
```

These should be co-located in the design system package so they can be consumed by both the notes web app and any future mobile web views.

### Typography Hierarchy in Use

| Context | Scale |
|---|---|
| Page titles | `heading-2` |
| Section labels | `subheading-3` |
| Body copy | `body-2` |
| Metadata / timestamps | `body-3` / `body-4` |
| Status / badges | `body-4` |

### Sidebar Colors

```css
--color-sidebar:                 #f9f9f9
--color-sidebar-foreground:      #0d0d0d
--color-sidebar-accent:          rgba(0,0,0,0.06)
--color-sidebar-border:          rgba(0,0,0,0.08)
```

---

## Files to Touch

| File | Change |
|---|---|
| `packages/ui/src/styles/globals.css` | Add `pb-composer`, border/surface tokens |
| `apps/notes/app/routes/layout.tsx` | Remove per-route `pb-[...]`, use `pb-composer` |
| `apps/notes/app/routes/chat/chat.$chatId.tsx` | Hoist search overlay |
| `apps/notes/app/routes/notes/$noteId.tsx` | Use layout `contentMode` instead of manual padding |
| `apps/notes/app/components/notes-sidebar.tsx` | Add "View all" + pagination |
| `packages/ui/src/tokens/chat.ts` | Co-locate `chatTokens` from app into shared package |
