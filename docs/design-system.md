# Hominem Design System

**Maintained by:** Ponti Studios
**Last updated:** 2026-03-20
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
| `chatTokens.turnGap` | 20px — vertical gap between message turns |
| `chatTokens.turnPaddingY` | 8px — vertical padding per message row |
| `chatTokens.contentGap` | 8px — gap between content blocks (reasoning, tools, message) |
| `chatTokens.metadataGap` | 4px — gap in metadata row |
| `chatTokens.composerPadding` | 16px — composer internal padding |
| `chatTokens.composerGap` | 12px — gap between composer sections |
| `chatTokens.surfaces.user` | `colors['emphasis-highest']` — user bubble background |
| `chatTokens.surfaces.assistant` | `transparent` — assistant message surface |
| `chatTokens.surfaces.composer` | `colors['prompt-bg']` — composer background |
| `chatTokens.surfaces.suggestion` | `colors['bg-base']` — suggestion chip surface |
| `chatTokens.borders.user` | `colors['border-subtle']` — user bubble border |
| `chatTokens.borders.composer` | `colors['prompt-border']` — composer border |
| `chatTokens.foregrounds.user` | `colors.white` — user bubble text |
| `chatTokens.foregrounds.metadata` | `colors['text-tertiary']` — timestamp/label text |
| `chatTokens.radii.bubble` | `radii.md` — message bubble radius |
| `chatTokens.radii.composer` | `radii.md` — composer radius |
| `chatTokens.radii.suggestion` | `radii.md` — suggestion chip radius |

**Native tokens** (`chatTokensNative`): identical structure, uses `radiiNative.md` for all radii.

---

## Product surface guidance

### Chat — Full Design Specification

This is the canonical reference for all chat UI across web and mobile. Every chat component must follow these rules.

#### Anatomy

A chat screen consists of four regions, top to bottom:

```
┌──────────────────────────────────────┐
│  ChatHeader                          │  ← Fixed, non-scrolling
├──────────────────────────────────────┤
│                                      │
│  ChatMessages (scrollable)           │  ← Virtualised if > 50 items
│    └── ChatMessage (per turn)        │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  Composer (pinned)                   │  ← Always visible
└──────────────────────────────────────┘
```

#### ChatHeader (web)

| Property | Value |
|----------|-------|
| Background | `colors['bg-elevated']` with `bg-overlay` backdrop |
| Height | 56px mobile, 60px desktop |
| Border bottom | `1px solid colors['border-subtle']` |
| Back button | Left-aligned, 44×44px touch target |
| Title area | Centre-aligned, max-width 50% of header |
| Context anchor | `body-3` text, `colors['text-tertiary']` |
| Status copy | `body-4` text, `colors['text-tertiary']` |
| Actions | Right-aligned, icon buttons 44×44px |

**States:**
- New conversation: "New conversation"
- With messages: "{n} messages"
- Classifying: "Preparing note review"
- Reviewing: "Review ready"
- Persisting: "Saving note"

**Mobile header extras:**
- Safe area insets applied to top padding
- Context anchor shows above status copy
- Icon buttons 36×36px minimum

#### ChatMessages — Scroll Container

| Property | Web | Mobile |
|----------|-----|--------|
| Max width | `chatTokens.transcriptMaxWidth` (768px) | Full width |
| Horizontal padding | 24px desktop, 16px mobile | 16px |
| Vertical padding | 24px top, 32px bottom (clearance for composer) | 4px top |
| Scroll | Native overflow-y | `FlatList` with `inverted` or standard |
| Composer clearance | 32px bottom padding | `CHAT_COMPOSER_CLEARANCE` token |
| Auto-scroll | On new message if user is near bottom | Same |
| Virtualisation threshold | 50 messages | Same |

#### ChatMessage — Per-turn rendering

Each turn consists of:
1. Optional reasoning block (assistant only, above main content)
2. Tool calls (if any, shown in order)
3. Main message content
4. Focus items (referenced notes, collapsed by default)
5. Metadata row (sender label + timestamp)
6. Actions row (copy, edit, regenerate, delete, speak, share)

**Turn spacing:** `chatTokens.turnGap` (20px) between adjacent turns.

**Content gaps:** `chatTokens.contentGap` (8px) between reasoning → tools → content.

#### User message bubble

| Property | Web | Mobile |
|----------|-----|--------|
| Max width | `chatTokens.userBubbleMaxWidth` (544px) | 85% of screen width |
| Background | `chatTokens.surfaces.user` = `colors['emphasis-highest']` | Same token |
| Border | `1px solid chatTokens.borders.user` | Same |
| Border radius | `chatTokens.radii.bubble` = `radii.md` (10px) | Same (numeric on mobile) |
| Padding | `spacing[4]` (16px) horizontal, `spacing[3]` (12px) vertical | Same |
| Text color | `chatTokens.foregrounds.user` = `colors.white` | Same |
| Font | `body-1` (16px / 400) | 17px / 400 (mobile body-1 equivalent) |
| Alignment | Right | Right |
| Shadow | `shadows.low` | RN shadow equivalent |
| Margin | 0 — bubble is inline, row handles alignment | Same |

**Forbidden:** Never add a visible avatar for the user. Never show "You" label inside the bubble.

#### Assistant message surface

| Property | Web | Mobile |
|----------|-----|--------|
| Width | Full transcript width (up to 768px) | Full width |
| Background | `transparent` | `transparent` |
| Border | None | None |
| Text color | `colors['text-primary']` | `colors.foreground` |
| Font | `body-1` (16px / 400) | 18px / 400 (slightly larger for readability) |
| Line height | 1.6 | 1.5 |
| Alignment | Left | Left |

**Never wrap assistant messages in a bubble.** The transcript is prose; bubbles are for user messages only.

#### Metadata row

| Property | Value |
|----------|-------|
| Font | `body-4` (12px) |
| Color | `chatTokens.foregrounds.metadata` = `colors['text-tertiary']` |
| Gap | `chatTokens.metadataGap` (4px) |
| Opacity | 0.7 |
| Content | Sender label · Relative timestamp |
| Alignment | Matches message alignment (user → right, assistant → left) |

**Rules:**
- "You" for user messages, "AI Assistant" for assistant messages — never initials
- Show relative timestamp: "just now", "2m ago", "Yesterday"
- Never show absolute timestamps in the transcript (they're in the debug panel)

#### Actions row

| Property | Value |
|----------|-------|
| Visibility | Hidden by default, visible on hover (web) / always visible (mobile) |
| Transition | CSS `opacity 120ms ease` on group hover |
| Gap | `spacing[1]` (4px) between actions |
| Alignment | Matches message alignment |
| Icons | 20px, `colors['text-tertiary']`, hover → `colors['text-primary']` |
| Touch target | 44×44px minimum (add invisible padding if needed) |
| aria-label | Required on every icon-only button |

**Web only:** Actions row is inside `.group` — visible when message row is hovered.

**Actions per message type:**

| Action | User | Assistant |
|--------|------|-----------|
| Copy | ✅ | ✅ |
| Edit | ✅ | ❌ |
| Regenerate | ❌ | ✅ |
| Delete | ✅ | ✅ |
| Speak (TTS) | ❌ | ✅ |
| Share | ❌ | ✅ |

#### Reasoning block (assistant)

| Property | Value |
|----------|-------|
| Background | `colors['bg-surface']` |
| Border left | `3px solid colors['border-default']` |
| Padding | `spacing[4]` (16px) left, `spacing[2]` (8px) vertical |
| Font | `body-4` (12px), `fontFamiliesNative.mono` |
| Color | `colors['text-tertiary']` |
| Label | "Reasoning" or icon (optional, can be omitted) |
| Collapsed | Default to visible if content is short (< 200 chars), collapsed if long |

#### Tool calls

| Property | Value |
|----------|-------|
| Surface | `colors['bg-surface']` with `1px border border-subtle` |
| Radius | `chatTokens.radii.bubble` = `radii.md` |
| Padding | `spacing[3]` (12px) |
| Tool name | `body-4` (12px), `fontWeight: 600` |
| Args | `fontFamiliesNative.mono`, 12px, `colors['text-secondary']` |
| Status indicator | Dot: `accent` = running, `success` = completed, `destructive` = error |
| Gap between tools | `chatTokens.contentGap` (8px) |

#### Focus items (referenced notes)

| Property | Value |
|----------|-------|
| Surface | `colors['bg-base']` with `1px border border-default` |
| Radius | `radii.md` |
| Padding | `spacing[2]` (8px) horizontal, `spacing[1]` (4px) vertical |
| Font | `body-4` (12px) |
| Icon | 14px, inline with text |
| State | Collapsed by default (show count only) |
| On tap | Expand to show note title/preview |

#### Composer (web)

| Property | Value |
|----------|-------|
| Container | `Stack gap="md"`, full width up to `NOTES_MAX_WIDTH` (768px) |
| Surface | `chatTokens.surfaces.composer` = `colors['prompt-bg']` |
| Border | `1px solid chatTokens.borders.composer` |
| Radius | `1.75rem` (28px) — **exception**: this radius does not map to a token; document the exception here |
| Shadow | `shadows.low` |
| Padding | `chatTokens.composerPadding` (16px) |
| Shadow on focus | Upgrade to `shadows.medium` |
| Textarea | `body-1` (16px), `colors['text-primary']`, no border |
| Placeholder | `colors['text-tertiary']`, 15px |
| Submit button | 36×36px, circular, `colors.foreground` background, white icon |

**Composer toolbar:**
- Attach files: icon button 28×28px, `colors['text-tertiary']`
- Audio: icon button 28×28px, `colors['text-tertiary']`
- Note picker: icon button 28×28px, `colors['text-tertiary']`

**Suggestions strip (shown when input is empty):**
- Surface: `chatTokens.surfaces.suggestion` = `colors['bg-base']`
- Border: `1px solid border-default`
- Radius: `radii.md`
- Padding: `spacing[2]` (8px) horizontal, `spacing[1]` (4px) vertical
- Font: `body-2` (14px), `colors['text-secondary']`
- On tap: insert suggestion text into textarea, focus textarea

#### Composer (mobile)

| Property | Value |
|----------|-------|
| Container | Full width, safe-area aware |
| Surface | `colors['bg-elevated']` |
| Border top | `1px solid colors['border-default']` |
| Shadow | `shadows.low` (iOS only) |
| Textarea | 17px font, `colors.foreground`, min-height 44px |
| Placeholder | `colors['text-tertiary']` |
| Submit | 44×44px touch target, `colors.accent` background |
| Clearance | `CHAT_COMPOSER_CLEARANCE` (220px default, adjust for safe areas) |

#### Thinking indicator (streaming)

| Property | Web | Mobile |
|----------|-----|--------|
| Label | "AI Assistant" in `body-4` | Same |
| Indicator | 3 dots, 8px each, `colors['text-tertiary']` | Same |
| Animation | CSS `animate-pulse` (web) | react-native-reanimated bounce dots |
| Timing | Use motion tokens: `durations.enter`, `durations.exit` | Same |
| Text | "Thinking…" in `body-4`, `colors['text-tertiary']` |

**Web:** Use a custom CSS animation class, not Tailwind's `animate-pulse`. Define it in `animations.css`.

**Mobile:** Use react-native-reanimated `withSequence` + `withTiming`. Do not use `Animated` from React Native core.

#### Shimmer / skeleton messages

| Property | Web | Mobile |
|----------|-----|--------|
| Structure | Match the shape of real messages | Same |
| Background | `colors['bg-surface']` | `colors.muted` or `colors['emphasis-minimal']` |
| Animation | `playShimmer(el)` — GSAP (web) | react-native-reanimated pulse (mobile) |
| Duration | Per motion tokens | Same |
| Rows | 3 skeleton rows for initial load | Same |
| Stagger | `i * 0.04`, max 5 rows | Same |
| Kill on resolve | Yes — always `.kill()` the shimmer | Cancel the animation |

**Rules:**
- Never show skeleton for < 300ms (perceived as a flash)
- If load resolves in < 300ms, skip skeleton entirely
- Match the radius of real content bubbles

#### Error display

| Property | Value |
|----------|-------|
| Surface | `colors['bg-surface']` with `1px border border-destructive/30` |
| Background tint | `colors['destructive']` at 5% opacity |
| Radius | `radii.md` |
| Padding | `spacing[4]` (16px) |
| Headline | `body-2`, `fontWeight: 600`, `colors.destructive` |
| Body | `body-4`, `colors.destructive` at 70% opacity |

#### Empty state

| Property | Value |
|----------|-------|
| Icon | 48px, `colors['text-tertiary']` |
| Headline | `heading-3`, `colors['text-primary']` |
| Body | `body-2`, `colors['text-secondary']` |

---

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

---

## Chat component inventory

This table tracks the implementation status of every chat component. Components marked ❌ need work to meet the design spec above.

### Web (`apps/web/app/components/chat/`)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| ChatMessage | `ChatMessage.tsx` | ❌ | Hardcoded Tailwind classes, no message enter animation, inconsistent token usage |
| ChatMessages | `ChatMessages.tsx` | ❌ | Uses raw `space-y-4`, no GSAP enter animation on messages, shimmer needs work |
| ChatInput | `ChatInput.tsx` | ❌ | Raw rgba() values, non-token radius, non-token submit button |
| ChatHeader | `ChatHeader.tsx` | ⚠️ | Mostly OK, minor token fixes needed |
| ChatModals | `ChatModals.tsx` | ⚠️ | Review for token usage |
| FileUploader | `FileUploader.tsx` | ⚠️ | Review for token usage |

### Mobile (`apps/mobile/components/chat/`)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Chat | `chat.tsx` | ⚠️ | Container OK, composer clearance needs token |
| ChatMessage | `chat-message.tsx` | ❌ | Hardcoded font sizes, raw color values, no message enter animation, edit modal is bare |
| ChatMessageList | `chat-message-list.tsx` | ⚠️ | FlatList without keyExtractor issues, no enter animations |
| ChatInput | `chat-input.tsx` | ❌ | **Stub — returns null. Must be implemented.** |
| ChatHeader | `chat-header.tsx` | ❌ | Raw spacing values, inconsistent button sizing |
| ChatShimmerMessage | `chat-shimmer-message.tsx` | ❌ | Wrong background color token, non-token animation timing |
| ChatThinkingIndicator | `chat-thinking-indicator.tsx` | ❌ | Hardcoded timing values instead of motion tokens |

### Shared UI (`packages/ui/src/components/ai-elements/`)

| Component | File | Status | Notes |
|-----------|------|--------|-------|
| Message | `message.tsx` | ❌ | Uses Tailwind prose classes, `bg-emphasis-highest` not a proper token, no animations |
| Conversation | `conversation.tsx` | ⚠️ | Mostly decorative, review tokens |
| Response | `response.tsx` | ❌ | Uses `prose` and `muted` classes instead of tokens, `animate-pulse` should be CSS class |
| MarkdownContent | `response.tsx` | ⚠️ | Wraps markdown, needs design system prose token config |
| Reasoning | `response.tsx` | ⚠️ | Needs consistent styling |
| Tool | `response.tsx` | ⚠️ | Needs consistent styling |
| ToolInput | `response.tsx` | ⚠️ | Needs consistent styling |
| ContextAnchor | `context-anchor.tsx` | ⚠️ | Review for token usage |
| ConversationEmptyState | `conversation.tsx` | ⚠️ | Uses `muted-foreground` instead of `text-tertiary` |

**Legend:**
- ✅ = Compliant with design spec
- ⚠️ = Mostly compliant, minor fixes needed
- ❌ = Needs significant rework to comply with spec
