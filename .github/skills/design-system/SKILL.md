---
name: design-system
description: >
  Apply when writing, reviewing, or modifying any UI code — components, styles,
  animations, tokens, or layout. Enforces the Hominem design system: Apple HIG
  alignment, strict token usage, GSAP-only interactive animations, minimalism,
  and performance. Extends the Ponti Studios base design system with Hominem-
  specific token paths, product surfaces (Focus route, HyperForm, sidebar,
  chat transcript, note detail), and import conventions.
license: MIT
compatibility: apps/notes, apps/mobile, packages/ui
metadata:
  author: Ponti Studios
  version: "2.0"
  category: Frontend
  tags: [design-system, tokens, gsap, animation, typography, color, spacing, components, accessibility, performance, hominem, notes, chat, hyperform]
references:
  # Hominem-specific overrides and product surface guidance
  hominem-spec:     docs/design-system.md

  # Universal Ponti Studios rules (source of truth for all non-Hominem-specific rules)
  foundations:      packages/ui/src/lib/gsap/sequences.ts
  tokens:           packages/ui/src/tokens/index.ts
  colors:           packages/ui/src/tokens/colors.ts
  spacing:          packages/ui/src/tokens/spacing.ts
  typography:       packages/ui/src/tokens/typography.ts
  radii:            packages/ui/src/tokens/radii.ts
  shadows:          packages/ui/src/tokens/shadows.ts
  motion:           packages/ui/src/tokens/motion.ts
  notes-tokens:     packages/ui/src/tokens/notes.ts
  chat-tokens:      packages/ui/src/tokens/chat.ts
  sequences:        packages/ui/src/lib/gsap/sequences.ts
  globals:          packages/ui/src/styles/globals.css
  animations:       packages/ui/src/styles/animations.css
---

# Hominem Design System Skill

You are enforcing the Hominem design system. This is not a style guide — it is law.

**Before writing any UI code:**
1. Read `docs/design-system.md` — Hominem-specific overrides, import paths, token namespaces, product surfaces
2. Read the universal Ponti Studios rules from the reference files listed in this skill's frontmatter — these cover typography, color, spacing, elevation, radii, motion, all component specs, interaction states, accessibility, responsive behaviour, overlay stacking, copy style, image handling, gestures, scrollbars, cursors, empty states, toasts, markdown, tables, code blocks, avatars, skeletons, links, forms

Both must be consulted. The Hominem spec adds to — never replaces — the universal rules.

---

## When this skill applies

- Writing or modifying any React component (web or React Native)
- Adding or changing CSS or Tailwind classes
- Adding or changing an animation or transition
- Creating a new token or referencing an existing one
- Building or modifying a product surface (Focus feed, HyperForm, sidebar, chat, note detail)
- Reviewing UI code for correctness
- Adding a new component variant, state, or layout pattern

---

## Hominem-specific rules

These extend the universal Ponti Studios rules. All universal rules also apply in full.

### Token imports

```ts
// Web
import { colors, spacing, radii, shadows, durations,
         notesStream, notesSurfaces, notesTypography, notesRadii, notesBorders,
         chatTokens, NOTES_MAX_WIDTH, NOTES_WORKSPACE_ASIDE_WIDTH
       } from '@hominem/ui/tokens'

// Animation
import { playFocusExpand, playFocusCollapse, playContextSwitch,
         playSubmitPulse, playEnterRow, playExitRow, playShimmer,
         reducedMotion } from '@hominem/ui/lib/gsap'
```

Never hardcode a value that a token covers. If a token doesn't exist, add it to `packages/ui/src/tokens/` before using it.

### CSS animations scope

`void-anim-*` classes in `packages/ui/src/styles/animations.css` are for:
- `Radix Dialog`, `Radix Popover`, `Radix DropdownMenu`, `Radix Tooltip`, `Radix Sheet` only

All product surface animations: GSAP via `@hominem/ui/lib/gsap`.

### Icon libraries

- Web: `lucide-react` (named imports only)
- Mobile: `@expo/vector-icons/Feather` (named imports only)

Never import entire icon sets. Never use emoji as icons in UI chrome.

---

## Product surface rules

### Focus route (`/`) — unified feed

- Background: `notesSurfaces.page`
- Item radius: `notesRadii.feedItem` (14px)
- Item padding: `notesStream.itemPaddingX` × `notesStream.itemPaddingY` (20px × 16px)
- Gap between items: `notesStream.itemGap` (4px)
- Item hover: CSS 120ms transition to `notesStream.itemHover`
- Item enter: `playEnterRow(el, index * 0.04)`, max 5 staggered
- Skeleton: `playShimmer` per row, `.kill()` on data resolve
- Two variants: `NoteFocusItem` (title + preview + tags + timestamp) and `ChatFocusItem` (last message + note count + timestamp)
- Infinite scroll: `IntersectionObserver` sentinel triggers next page query

### HyperForm — context-aware input

Mode is derived from route only. Never store mode in component state.

| Route | Mode | Placeholder | Behaviour |
|-------|------|-------------|-----------|
| `/` | default | "Write a note or start a chat…" | On send: inline Note / Chat type selector |
| `/chat/:chatId` | chat | "Message…" | Continues active chat via `useChat` |
| `/notes/:noteId` | note | — | HyperForm collapses via `playFocusCollapse` |

Animations:
- Mount → `playFocusExpand`
- Route change (mode switch) → `playContextSwitch` on placeholder/label elements
- Submit → `playSubmitPulse(btnEl, inputEl, onComplete)`
- Entering note route → `playFocusCollapse`

Chat mode: note picker button in toolbar opens `note-picker-sheet.tsx`.
Context strip above input: one pill per referenced note with remove (×) button.
`referencedNotes: string[]` is included in the chat message payload.

### Sidebar — stream navigator

Single chronological list. Not two typed lists.

- Background: `colors['sidebar']`; border right: `colors['sidebar-border']`
- Each row: `SidebarFocusItem` — type icon (16px, `notesStream.typeIconSize`), title (truncated), relative timestamp
- Filter pills: **All | Notes | Chats** — client-side, no refetch
- Active item: `colors['sidebar-accent']` bg, `colors['sidebar-accent-foreground']` text
- New items: `playEnterRow(el, index * 0.04)`
- No "View all" links — the sidebar is the full navigator

### Chat transcript (`/chat/:chatId`)

- Content max width: `chatTokens.transcriptMaxWidth` (768px), centred
- User bubble max width: `chatTokens.userBubbleMaxWidth` (544px)
- Referenced notes: compact context block (note title + icon) above assistant reply, collapsed by default
- HyperForm pinned at bottom, full width up to `NOTES_MAX_WIDTH`

### Note detail (`/notes/:noteId`)

- Content max width: `NOTES_MAX_WIDTH` (768px), centred
- HyperForm: hidden — collapses on mount with `playFocusCollapse`
- Markdown rendering: follows `design-system-components.md` markdown rules

---

## Reference files — read before acting

| Purpose | File |
|---------|------|
| **Hominem overrides + product surfaces** | `docs/design-system.md` |
| Token barrel | `packages/ui/src/tokens/index.ts` |
| Colors | `packages/ui/src/tokens/colors.ts` |
| Spacing | `packages/ui/src/tokens/spacing.ts` |
| Typography | `packages/ui/src/tokens/typography.ts` |
| Radii | `packages/ui/src/tokens/radii.ts` |
| Shadows | `packages/ui/src/tokens/shadows.ts` |
| Motion constants | `packages/ui/src/tokens/motion.ts` |
| Notes tokens | `packages/ui/src/tokens/notes.ts` |
| Chat tokens | `packages/ui/src/tokens/chat.ts` |
| GSAP sequences | `packages/ui/src/lib/gsap/sequences.ts` |
| Global CSS | `packages/ui/src/styles/globals.css` |
| CSS animations (Radix only) | `packages/ui/src/styles/animations.css` |

---

## Review checklist

Fail the review if any of the following are violated.

### Tokens and values
- [ ] No hardcoded colors, sizes, radii, durations, z-indices, or font values
- [ ] Imports from `@hominem/ui/tokens` — not raw file paths
- [ ] Platform-correct token keys used (web vs. native)
- [ ] New token added to `packages/ui/src/tokens/` if a value was missing

### Animation
- [ ] All interactive animations use GSAP sequences from `@hominem/ui/lib/gsap`
- [ ] Radix component states use `void-anim-*` CSS classes only
- [ ] `reducedMotion()` guard respected — no sequences bypass it
- [ ] No animation of `width`, `height`, `top`, `left`, `right`, `bottom`, `box-shadow`
- [ ] 60fps achievable on mid-range device

### Typography and copy
- [ ] Composed utility classes only — no raw `text-sm font-medium` combinations
- [ ] Font weight ≤ 700
- [ ] Mobile inputs ≥ 16px font size
- [ ] Button labels: verb-first, sentence case
- [ ] Error messages tell the user what to do

### Color and contrast
- [ ] All colors from CSS custom properties — no raw Tailwind palette
- [ ] Text dimmed via tier token, not opacity
- [ ] Accent (`#007AFF`) and destructive (`#FF3B30`) never swapped
- [ ] WCAG AA contrast met (4.5:1 body text, 3:1 UI components)

### Accessibility
- [ ] Touch targets ≥ 44px × 44px
- [ ] Focus ring present on all interactive elements
- [ ] Modals and sheets trap focus with `aria-modal="true"`
- [ ] Focus returns to trigger element on close
- [ ] No `tabIndex > 0`
- [ ] Alt text on non-decorative images
- [ ] `aria-label` on all icon-only buttons

### Components and states
- [ ] All required interaction states: hover, focus-visible, active, disabled
- [ ] Loading and error states implemented where applicable
- [ ] Component spec consulted before implementing
- [ ] No new variants without updating `docs/design-system.md`

### Product surfaces
- [ ] HyperForm mode derived from route only — no component state for mode
- [ ] Correct token namespace used: `notesStream.*`, `notesSurfaces.*`, `chatTokens.*` as appropriate
- [ ] Feed items use `playEnterRow` with stagger (max 5 items)
- [ ] Sidebar is a single chronological list — no typed sections

### Layout and responsive
- [ ] Mobile-first — base styles are mobile, breakpoints layer up
- [ ] No max-width media queries
- [ ] Z-index from token scale only
- [ ] Only one modal/sheet open at a time
- [ ] Toasts portal to `document.body`

### Performance
- [ ] Lists > 50 items virtualised
- [ ] `React.memo` on feed and sidebar row components
- [ ] Routes lazy-loaded with `React.lazy` + `Suspense`
- [ ] Named icon imports only from `lucide-react` or `@expo/vector-icons/Feather`
- [ ] No `lodash`
- [ ] Explicit `width` and `height` on images
