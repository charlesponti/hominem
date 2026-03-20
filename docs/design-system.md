# Hominem Design System

**Maintained by:** Ponti Studios
**Last updated:** 2026-03-19
**Status:** Law
**Base system:** [Ponti Studios Design System](https://github.com/charlesponti/jinn) — all rules defined there apply here in full. This document adds Hominem-specific overrides, token paths, and product surface guidance only.

---

## What this document covers

The universal Ponti Studios rules (typography scale, color palette, spacing grid, elevation, radii, motion mandate, component specs, interaction states, accessibility, performance, responsive behaviour, overlay stacking, copy style, image handling, gesture thresholds, scrollbars, cursor rules, empty states, toasts, markdown rendering, tables, code blocks, avatars, skeletons, links, forms) are defined in the jinn design-system skill and its four reference files:

- `design-system-foundations.md` — tokens, typography, color, spacing, elevation, radii, grid, z-index, a11y
- `design-system-motion.md` — GSAP mandate, canonical sequences, timing, easing, reduced motion, mobile animation
- `design-system-components.md` — all component specifications
- `design-system-patterns.md` — responsive, overlay stacking, copy style, image handling, gestures, focus, scrollbars, cursors

This document extends those rules with Hominem-specific import paths, token namespaces, and product surface guidance.

---

## Token imports

```ts
import {
  colors,
  spacing,
  typography,
  radii,
  shadows,
  durations,
  notesStream,
  notesSurfaces,
  notesTypography,
  notesRadii,
  notesBorders,
  chatTokens,
  NOTES_MAX_WIDTH,
  NOTES_WORKSPACE_ASIDE_WIDTH,
} from '@hominem/ui/tokens'
```

All tokens live in `packages/ui/src/tokens/`. **Never hardcode a value that a token covers.**

## Animation imports

```ts
import {
  playFocusExpand,
  playFocusCollapse,
  playContextSwitch,
  playSubmitPulse,
  playEnterRow,
  playExitRow,
  playShimmer,
  reducedMotion,
  GSAP_DURATION_ENTER,
  GSAP_DURATION_EXIT,
  GSAP_EASE_ENTER,
  GSAP_EASE_EXIT,
  GSAP_EASE_STANDARD,
} from '@hominem/ui/lib/gsap'
```

---

## Token file locations

| Purpose | Path |
|---------|------|
| Token barrel | `packages/ui/src/tokens/index.ts` |
| Colors | `packages/ui/src/tokens/colors.ts` |
| Spacing | `packages/ui/src/tokens/spacing.ts` |
| Typography | `packages/ui/src/tokens/typography.ts` |
| Radii | `packages/ui/src/tokens/radii.ts` |
| Shadows | `packages/ui/src/tokens/shadows.ts` |
| Motion constants | `packages/ui/src/tokens/motion.ts` |
| Notes-specific tokens | `packages/ui/src/tokens/notes.ts` |
| Chat-specific tokens | `packages/ui/src/tokens/chat.ts` |
| GSAP sequences | `packages/ui/src/lib/gsap/sequences.ts` |
| Global CSS | `packages/ui/src/styles/globals.css` |
| CSS animations (Radix only) | `packages/ui/src/styles/animations.css` |

---

## Platform divergence

| Concern | Web | Mobile |
|---------|-----|--------|
| Font | Geist | Inter |
| Animation | GSAP via `@hominem/ui/lib/gsap` | react-native-reanimated |
| CSS | Tailwind + CSS custom properties | StyleSheet / NativeWind |
| Radii (icon) | `22%` (squircle) | `20px` (numeric) |
| Shadows | CSS `box-shadow` | RN shadow object |
| Safe area | `env(safe-area-inset-*)` | react-native-safe-area-context |
| Touch targets | CSS invisible padding | `hitSlop` prop |
| Viewport height | `100dvh` | `useWindowDimensions` |

Token files export both variants — see `radii.ts` and `shadows.ts` (`web` and `native` keys).
Never use a web-only value in mobile code and vice versa.

---

## Hominem-specific token namespaces

### Notes tokens (`packages/ui/src/tokens/notes.ts`)

| Token | Purpose |
|-------|---------|
| `NOTES_MAX_WIDTH` | 768px — max width for note and chat content columns |
| `NOTES_WORKSPACE_ASIDE_WIDTH` | 416px — workspace aside panel width |
| `notesStream.itemHover` | Feed item hover background → `colors['bg-surface']` |
| `notesStream.itemBorder` | Feed item border → `colors['border-subtle']` |
| `notesStream.itemRadius` | Feed item radius → `radii.lg` (14px) |
| `notesStream.itemPaddingX` | Feed item horizontal padding → `spacing[5]` (20px) |
| `notesStream.itemPaddingY` | Feed item vertical padding → `spacing[4]` (16px) |
| `notesStream.itemGap` | Gap between feed items → `spacing[1]` (4px) |
| `notesStream.typeIconSize` | Note/chat type icon → 16px |
| `notesSurfaces.page` | Feed page background → `colors['bg-base']` |
| `notesSurfaces.panel` | Panel background → `colors['bg-surface']` |
| `notesBorders.divider` | Feed dividers → `colors['border-subtle']` |
| `notesTypography.noteTitle` | Feed item title role → `heading-4` |
| `notesTypography.noteBody` | Feed item preview role → `body-2` |
| `notesTypography.timestamp` | Timestamp role → `body-4` |
| `notesRadii.panel` | Panel radius → `radii.xl` (20px) |
| `notesRadii.feedItem` | Feed item radius → `radii.lg` (14px) |
| `notesRadii.badge` | Badge radius → `radii.sm` (6px) |

### Chat tokens (`packages/ui/src/tokens/chat.ts`)

| Token | Purpose |
|-------|---------|
| `chatTokens.transcriptMaxWidth` | 768px — chat transcript max width |
| `chatTokens.searchMaxWidth` | 640px — search overlay max width |
| `chatTokens.userBubbleMaxWidth` | 544px — user message bubble max width |

---

## Product surface guidance

### Focus route (`/`)

The Focus route is the unified feed of notes and chats.

- Background: `notesSurfaces.page`
- Feed items: `FocusItem` component, two variants — `NoteFocusItem` and `ChatFocusItem`
- Item radius: `notesRadii.feedItem` (14px)
- Item padding: `notesStream.itemPaddingX` × `notesStream.itemPaddingY` (20px × 16px)
- Gap between items: `notesStream.itemGap` (4px)
- Item hover: CSS transition to `notesStream.itemHover` background
- Item animation on enter: `playEnterRow(el, index * 0.04)` — staggered cascade, max 5 items
- Skeleton on load: `playShimmer` per skeleton row, kill on data resolve
- Infinite scroll: `IntersectionObserver` sentinel at bottom of feed triggers next page

### HyperForm

The always-present context-aware input. Mode is derived from route — no component state.

| Route | Mode | Placeholder | Behaviour |
|-------|------|-------------|-----------|
| `/` | default | "Write a note or start a chat…" | On send: show Note / Chat inline selector |
| `/chat/:chatId` | chat | "Message…" | Sends to active chat via `useChat` |
| `/notes/:noteId` | note | — | HyperForm collapses via `playFocusCollapse` |

Animations:
- Mount: `playFocusExpand`
- Mode switch (route change): `playContextSwitch` on placeholder/label elements
- Submit: `playSubmitPulse(btnEl, inputEl, onComplete)`
- Collapse (note route): `playFocusCollapse`

Chat mode extras:
- Note picker button in toolbar — opens `note-picker-sheet.tsx`
- Context strip above input: pill per referenced note, with remove (×) button
- `referencedNotes: string[]` passed with each chat message payload

### Sidebar

The sidebar is a single chronological stream navigator — not two typed lists.

- Background: `colors['sidebar']`
- Border right: `colors['sidebar-border']`
- Items: `SidebarFocusItem` — type icon (16px), title (truncated), relative timestamp
- Filter pills at top: **All | Notes | Chats** — client-side filter, no refetch
- Active item: `colors['sidebar-accent']` background, `colors['sidebar-accent-foreground']` text
- Item enter animation: `playEnterRow(el, index * 0.04)`
- No "View all" links — the sidebar IS the full navigator

### Chat transcript

- Max width: `chatTokens.transcriptMaxWidth` (768px), centred
- User bubble max width: `chatTokens.userBubbleMaxWidth` (544px)
- Referenced notes: compact context block (note title + icon) above assistant reply, collapsed by default
- HyperForm pinned at bottom, full width up to `NOTES_MAX_WIDTH`

### Note detail (`/notes/:noteId`)

- Content max width: `NOTES_MAX_WIDTH` (768px), centred
- HyperForm: hidden (collapses on mount with `playFocusCollapse`)
- Markdown rendering: follows design system markdown rules — see `design-system-components.md`

---

## CSS animation classes (Radix only)

The `void-anim-*` classes in `packages/ui/src/styles/animations.css` apply exclusively to:
- `Radix Dialog` open/close
- `Radix Popover` open/close
- `Radix DropdownMenu` open/close
- `Radix Tooltip` enter/exit
- `Radix Sheet` slide in/out

All product surface animations: GSAP via `@hominem/ui/lib/gsap`.

---

## Icon libraries

| Platform | Library |
|----------|---------|
| Web | `lucide-react` (named imports only) |
| Mobile | `@expo/vector-icons/Feather` (named imports only) |

Never import entire icon sets. Never use emoji as icons in UI chrome.

---

## What is already built

| Item | Location | Status |
|------|----------|--------|
| Color tokens | `packages/ui/src/tokens/colors.ts` | ✅ |
| Spacing tokens | `packages/ui/src/tokens/spacing.ts` | ✅ |
| Typography tokens | `packages/ui/src/tokens/typography.ts` | ✅ |
| Radii tokens | `packages/ui/src/tokens/radii.ts` | ✅ |
| Shadow tokens | `packages/ui/src/tokens/shadows.ts` | ✅ |
| Motion tokens | `packages/ui/src/tokens/motion.ts` | ✅ |
| Notes tokens | `packages/ui/src/tokens/notes.ts` | ✅ |
| Chat tokens | `packages/ui/src/tokens/chat.ts` | ✅ |
| GSAP sequences | `packages/ui/src/lib/gsap/sequences.ts` | ✅ |
| `gsap` dependency | `packages/ui/package.json` | ✅ |
| `@hominem/ui/lib/gsap` export | `packages/ui/package.json` | ✅ |
| Global CSS | `packages/ui/src/styles/globals.css` | ✅ |
| CSS animations | `packages/ui/src/styles/animations.css` | ✅ |
