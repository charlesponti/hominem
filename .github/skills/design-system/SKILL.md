---
name: design-system
description: |
  Apply when writing, reviewing, or modifying any UI code — components, styles, animations, tokens, or layout. Enforces the Ponti Studios design system: Apple HIG alignment, strict token usage, GSAP-only interactive animations, minimalism, and performance.
license: MIT
compatibility: Any frontend project using React (web or React Native)
metadata:
  author: Ponti Studios
  version: "2.0"
  generatedBy: "1.0.0"
  category: Frontend
  tags: [design-system, tokens, gsap, animation, typography, color, spacing, components, accessibility, performance, responsive, motion]
---

# Design System Skill

You are enforcing the Ponti Studios design system. This is not a style guide — it is law.

Before writing any UI code, read all four reference files emitted alongside this skill:
- `design-system-foundations.md` — tokens, typography, color, spacing, elevation, radii, grid, z-index, accessibility
- `design-system-motion.md` — GSAP mandate, canonical sequences, timing, easing, reduced motion, mobile animation
- `design-system-components.md` — button, input, card, sheet, badge, avatar, skeleton, toast, empty state, link, form, table, code block, markdown
- `design-system-patterns.md` — responsive behaviour, overlay stacking, focus management, copy/writing style, image handling, gesture thresholds, route transitions, scrollbars, cursor rules, selection styles

If reference files do not exist in the current project, fall back to the canonical rules in this skill.
Token files are the authoritative source of values. Never use a value that isn't in the token files.

---

## Philosophy

Three obsessions drive every decision.

1. **Performance.** Every pixel rendered, every byte shipped, every animation frame must earn its place. The UI must feel faster than the user expects.
2. **Minimalism.** Remove everything that doesn't serve a purpose. Complexity is a bug. If a component can be expressed with less, it must be.
3. **Joyful motion.** Animation communicates state, confirms intent, and creates delight. Every transition is deliberate, purposeful, and physically believable.

Deviation from this spec requires explicit justification. "It was easier" is not justification.

---

## Absolute rules — no exceptions

### Tokens
- All values come from tokens: colors, spacing, radii, shadows, durations, font sizes, z-indices.
- **Never hardcode** any of these values in a component or style file.
- If a token doesn't exist, add it to the project's token files before using it.
- Platform divergence (web vs. native) is handled inside token files — always use the platform-correct key.

### Animation (read design-system-motion.md in full)
- **All interactive animations on web MUST use GSAP via the project's canonical sequences file.**
- Never reimplement a canonical sequence locally — import it.
- CSS keyframe animations are reserved exclusively for Radix UI (or equivalent headless UI library) component enter/exit via data-attribute selectors.
- Never add new `@keyframes` for product surfaces.
- Every GSAP sequence must respect `reducedMotion()`.
- Never animate `width`, `height`, `top`, `left`, `right`, `bottom`, or `box-shadow`.
- On mobile: `react-native-reanimated` worklets only. Never `Animated` from React Native core.
- Target 60fps. If it can't hold 60fps on a mid-range device, remove it.

### Typography
- Use only composed utility classes: `.display-1/2`, `.heading-1–4`, `.body-1–4`, `.subheading-1–4`.
- Never mix raw size/weight utilities (e.g. `text-sm font-medium`) for product text.
- Never `font-weight` above 700.
- Minimum 16px on mobile form inputs — prevents iOS auto-zoom.
- Maximum line length: 72 characters for body copy.

### Color
- All color references through CSS custom properties. Never raw Tailwind palette classes.
- Text dimming: use the correct text tier token — never `opacity` on text.
- Accent = `#007AFF`. Destructive = `#FF3B30`. Never swap these.
- WCAG AA minimum contrast ratio: 4.5:1 for body text, 3:1 for large text and UI components.

### Spacing
- 8px primary grid. 4px secondary (internal fine-tuning only).
- Only `1px` is permitted outside the spacing scale — for hairline borders.

### Accessibility
- Touch targets: **44px × 44px minimum** (Apple HIG + WCAG 2.5.5).
- Focus ring: `outline: 2px solid accent; outline-offset: 2px`. Never suppress without replacement.
- Modals and sheets trap focus (`aria-modal="true"`).
- On close, return focus to the trigger element.
- Never `tabIndex > 0`.
- All non-decorative images need `alt` text.
- `aria-label` on all icon-only buttons.

### Interaction states
Every interactive element must implement all applicable states. Missing states are bugs.
- **Hover**: CSS `transition: background-color 120ms ease` (the only CSS animation exception)
- **Focus-visible**: `outline: 2px solid accent; outline-offset: 2px`
- **Active/pressed**: GSAP `scale(0.97)` on pointerdown, reversed on pointerup
- **Disabled**: `opacity: 0.4`, `cursor: not-allowed`, `pointer-events: none` — never change color
- **Loading**: spinner replaces label — never silently disable
- **Error**: destructive border + error message
- **Selected**: accent background + accent foreground

### Performance
- Lists > 50 items: virtualise (`react-window` web, `FlashList` mobile).
- `React.memo` on all feed/stream row components.
- Lazy-load routes: `React.lazy` + `Suspense`.
- Named icon imports only — never import entire icon libraries.
- Never import `lodash`. Use native methods.
- Explicit `width` and `height` on all images — prevents CLS.
- Never use `will-change` speculatively.

---

## Z-index scale

Use only these values. Never hardcode a z-index.

| Token | Value | Usage |
|-------|-------|-------|
| `z-base` | 0 | Static elements |
| `z-raised` | 10 | Sticky headers, floating buttons |
| `z-dropdown` | 100 | Dropdowns, popovers, tooltips |
| `z-overlay` | 200 | Modal/sheet backdrop |
| `z-modal` | 300 | Modals and sheets |
| `z-toast` | 400 | Toast notifications |
| `z-max` | 9999 | Emergency override only — justify in a comment |

### Overlay stacking rules
- Only one modal or sheet may be open at a time. Opening a second closes the first.
- Toasts render above all modals.
- Dropdowns and tooltips render above modals they are triggered from (`z-dropdown` = 100 is not above `z-modal` = 300, so portal them to document body).

---

## Breakpoints

| Name | Min width | Usage |
|------|-----------|-------|
| `sm` | 640px | Large phones, phablets |
| `md` | 768px | Tablets, split-view mobile |
| `lg` | 1024px | Laptops, two-column layouts |
| `xl` | 1280px | Desktops, max-width content |

Mobile-first. All base styles are mobile. Use `md:`, `lg:`, `xl:` to layer up.
Never use `max-width` media queries — never style down, always style up.

---

## Grid

- 4-column grid on mobile, 8-column on `md`, 12-column on `lg`+.
- Gutter: `spacing[4]` (16px) mobile, `spacing[5]` (24px) desktop.
- Content max widths from tokens: 768px (body), 640px (search), 480px (modal).
- Sidebar + main two-column: sidebar 240px fixed, main takes remaining width.

---

## Copy and writing style

- **Button labels**: verb-first, sentence case. "Save note" not "Save Note" or "SAVE".
- **Placeholder text**: describe the action, not the field. "Write a note or start a chat…" not "Enter text".
- **Error messages**: plain language, tell the user what to do. "Name can't be empty" not "Required field".
- **Empty state headlines**: active voice. "No notes yet" not "There are no notes".
- **Confirmation labels**: match the destructive action. "Delete note" not "Confirm" or "OK".
- **Loading labels**: progressive. "Saving…" not "Loading…" when saving.
- Never use ellipsis in button labels unless the action opens a dialog for more info.

---

## Chat-specific rules

These rules apply to all chat UI components: web (`apps/web/app/components/chat/`) and mobile (`apps/mobile/components/chat/`), plus shared UI components (`packages/ui/src/components/ai-elements/`).

### Token usage — no exceptions

Chat components must use `chatTokens` from `@hominem/ui/tokens` for all chat-specific values. Common violations to avoid:

- ❌ `bg-white`, `bg-bg-surface`, `text-foreground`, `text-text-primary` — use tokens
- ❌ `border-subtle`, `border-border-default` — use `colors['border-subtle']` from token
- ❌ `rounded-md`, `rounded-lg`, `rounded-[1.75rem]` — use `radii.md` or `chatTokens.radii.bubble`
- ❌ `rgba(0,0,0,0.08)`, `rgba(0,0,0,0.35)` — use `chatTokens.borders.composer`, `chatTokens.foregrounds.metadata`
- ❌ `shadow-sm`, `shadow-[0_2px_12px_...]` — use `shadows.low` / `shadows.medium`
- ❌ `space-y-4`, `py-4`, `px-4` — use `chatTokens.turnGap`, `chatTokens.turnPaddingY`, `chatTokens.composerPadding`
- ❌ Hardcoded font sizes (17, 18, 24) — use `fontSizes` from tokens or `body-1` class

### Bubble rules — the most important chat rule

**User messages:** Wrapped in a bubble.
- Background: `chatTokens.surfaces.user`
- Border: `1px solid chatTokens.borders.user`
- Radius: `chatTokens.radii.bubble`
- Max width: `chatTokens.userBubbleMaxWidth`
- Text: white, `body-1`
- Shadow: `shadows.low`
- Alignment: right

**Assistant messages:** Never wrapped in a bubble. Plain text, full transcript width.
- Background: transparent
- Text: `colors['text-primary']`, `body-1`
- Alignment: left

**Forbidden:**
- Never put assistant messages in a bubble
- Never show a user avatar
- Never put "You" inside the user bubble
- Never use `rounded-full` for message bubbles

### Message structure

Every message turn (user or assistant) consists of these layers, in order:

1. **Message row** — `py-2` (chatTokens.turnPaddingY), handles alignment
2. **MessageContent** — column container, handles max-width
3. **Reasoning** (assistant only) — above main content, 3px left border
4. **Tool calls** — below reasoning, above main content
5. **Main content** — bubble (user) or plain (assistant)
6. **Focus items** — referenced notes, collapsed
7. **Metadata** — sender label · timestamp, `body-4`, `text-tertiary`
8. **Actions** — hidden on hover (web), visible (mobile)

**Gap between layers:** `chatTokens.contentGap` (8px)

**Turn gap (between messages):** `chatTokens.turnGap` (20px)

### Animation requirements

**Message enter animation (web):** Every message rendered into the DOM must animate in:
```ts
playEnterRow(el, 0) // No stagger for new messages — stagger only on initial load
```

**Initial load shimmer:** Use `playShimmer` on each skeleton row. Kill on data resolve.
```ts
shimmerTween = playShimmer(skeletonEl)
dataResolve => shimmerTween.kill()
```

**Streaming cursor:** CSS custom animation class (not Tailwind `animate-pulse`). Define in `animations.css`.

**Reduced motion:** All animations must check `reducedMotion()`. The canonical sequences handle this automatically when imported correctly.

### Composer rules

**Web:**
- Border radius: `1.75rem` (28px) — documented exception in design-system.md
- Shadow upgrade on focus: `shadows.low` → `shadows.medium`
- Submit button: circular, 36×36px, foreground background, white icon
- Toolbar icons: 28×28px, `text-tertiary`

**Mobile:**
- **If the component returns `null`, it's a stub. It must be implemented.**
- Full width, safe-area aware
- Submit: 44×44px, accent background

### Mobile-specific

- Never use `Animated` from React Native core — use react-native-reanimated only
- Font sizes: 17px for body text (not 16px — iOS minimum)
- Line height: 1.5 for messages (iOS readability)
- `borderRadii.md` (numeric, not percentage)
- Safe area insets on header and composer
- Composer clearance: 220px minimum from bottom (accounts for keyboard + safe area)

### Chat shared components (`packages/ui/src/components/ai-elements/`)

These components are used by both platforms. They must:
- Use `chatTokens` for all chat-specific values
- Not hardcode any Tailwind color, spacing, or radius values
- Support both web and native via platform-correct token keys
- Not use `prose` classes — use design system typography classes instead
- Not use `animate-pulse` — use a custom CSS class or GSAP

### Common violations

| Violation | Fix |
|-----------|-----|
| `bg-white` or `bg-bg-surface` in chat | `chatTokens.surfaces.user` / `colors['bg-surface']` |
| `border-subtle` Tailwind class | `colors['border-subtle']` |
| `rounded-[1.75rem]` | Document exception or use `radii.lg` |
| `rounded-full` on message | `radii.md` or `chatTokens.radii.bubble` |
| Hardcoded font size (17, 18, 24) | `body-1` class or `fontSizes.body1` token |
| `rgba(0,0,0,0.35)` for muted text | `colors['text-tertiary']` |
| `space-y-4` between messages | `chatTokens.turnGap` |
| `animate-pulse` for streaming cursor | Custom CSS class in `animations.css` |
| `Animated` from react-native | react-native-reanimated worklet |
| Stub component returning `null` | Implement it |
| No message enter animation | `playEnterRow(el, 0)` on mount |
| No shimmer `.kill()` on data resolve | Call `.kill()` in `finally()` or data callback |

---

## Review checklist

Fail the review if any of the following are violated:

### Tokens & values
- [ ] No hardcoded colors, sizes, radii, durations, z-indices, or font values
- [ ] Platform-correct token keys used (web vs. native)
- [ ] New token added to token files if a value was missing

### Animation
- [ ] All interactive animations use GSAP canonical sequences
- [ ] Radix/headless UI states use CSS `void-anim-*` classes only
- [ ] `reducedMotion()` guard respected — no sequences bypass it
- [ ] No animation of layout-triggering CSS properties
- [ ] 60fps achievable on mid-range device

### Typography & copy
- [ ] Composed utility classes used — no raw size/weight combinations
- [ ] Font weight ≤ 700
- [ ] Mobile inputs ≥ 16px
- [ ] Button labels are verb-first, sentence case
- [ ] Error messages tell the user what to do

### Color & contrast
- [ ] All colors from CSS custom properties — no raw Tailwind palette
- [ ] Text dimmed via tier token, not opacity
- [ ] Accent and destructive never swapped
- [ ] WCAG AA contrast met (4.5:1 body, 3:1 UI components)

### Accessibility
- [ ] Touch targets ≥ 44px × 44px
- [ ] Focus ring present on all interactive elements
- [ ] Modals/sheets trap focus with aria-modal
- [ ] Focus returns to trigger on close
- [ ] No tabIndex > 0
- [ ] Alt text on non-decorative images
- [ ] aria-label on icon-only buttons

### Components & states
- [ ] All required interaction states implemented (hover, focus-visible, active, disabled)
- [ ] Loading and error states implemented where applicable
- [ ] Component spec consulted before implementing (design-system-components.md)
- [ ] No new component variants without updating the spec

### Layout & responsive
- [ ] Mobile-first — base styles are mobile, breakpoints layer up
- [ ] No max-width media queries
- [ ] Z-index from token scale only
- [ ] Only one modal/sheet open at a time
- [ ] Toasts portal to document body

### Performance
- [ ] Lists > 50 items virtualised
- [ ] React.memo on feed row components
- [ ] Routes lazy-loaded
- [ ] Named icon imports only
- [ ] Explicit width/height on images

### Chat UI
- [ ] `chatTokens` used for all chat-specific values (surfaces, borders, radii, spacing)
- [ ] User messages in bubble, assistant messages plain (no assistant bubble)
- [ ] No hardcoded Tailwind color classes (no `bg-white`, `text-foreground`, `border-subtle`)
- [ ] No hardcoded rgba values — tokens only
- [ ] No hardcoded font sizes or radii
- [ ] No `animate-pulse` — custom CSS class or GSAP for streaming cursor
- [ ] Mobile: react-native-reanimated used, not `Animated` from React Native core
- [ ] Message enter animation on mount (`playEnterRow` web, reanimated equivalent mobile)
- [ ] Shimmer tweens killed on data resolve (never left running)
- [ ] Composer shadow upgrade on focus (shadows.low → shadows.medium)
- [ ] Actions row has 44px minimum touch targets
- [ ] aria-label on all icon-only buttons
- [ ] No stub components returning `null`
- [ ] Mobile composer clearance accounts for keyboard + safe area
- [ ] Scroll containers have proper key extractors (never array index as key)
