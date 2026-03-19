# Hominem Design System

**Maintained by:** Ponti Studios
**Last updated:** 2026-03-19
**Status:** Law

---

## Philosophy

Three obsessions drive every decision in this system:

1. **Performance.** Every pixel rendered, every byte shipped, every animation frame must earn its place. The UI should feel faster than the user expects.
2. **Minimalism.** Remove everything that doesn't serve a purpose. If a component can be expressed with less, it must be. Complexity is a bug.
3. **Joyful motion.** Animation is not decoration — it communicates state, confirms intent, and creates delight. Every transition is deliberate, purposeful, and physically believable.

Deviation from this document requires explicit justification. "It was easier" is not justification.

---

## Tokens

All tokens live in `packages/ui/src/tokens/`. **Never hardcode a value that a token covers.** If a token doesn't exist for your use case, add it — don't inline a magic number.

Import from:
```ts
import { colors, spacing, typography, radii, shadows, durations, ... } from '@hominem/ui/tokens'
```

---

## Typography

### Fonts

| Platform | Primary | Monospace |
|---|---|---|
| Web | Geist | Geist Mono |
| Mobile | Inter | Geist Mono |

Fonts are loaded as CSS variables on web. On mobile, passed via `fontFamily` in the style prop. Never pass a font name as a raw string — use `typography.fontFamily.primary`.

### Type scale

| Token | Size | Weight | Line height | Usage |
|---|---|---|---|---|
| `display-1` | 28px / `clamp(24px, 4vw, 32px)` | 700 | 1.2 | Page hero titles |
| `display-2` | 24px | 600 | 1.2 | Section heroes |
| `heading-1` | 22px | 600 | 1.2 | Card or panel title, primary |
| `heading-2` | 20px | 600 | 1.3 | Section heading |
| `heading-3` | 18px | 600 | 1.3 | Sub-section heading |
| `heading-4` | 16px | 600 | 1.4 | Item title (stream card, sidebar item) |
| `body-1` | 16px | 400 | 1.6 | Primary body copy |
| `body-2` | 14px | 400 | 1.5 | Secondary body, item previews |
| `body-3` | 13px | 400 | 1.5 | Tertiary, meta text |
| `body-4` | 12px | 400 | 1.4 | Timestamps, labels, badge text |
| `subheading-1` | 14px | 500 | 1.4 | Strong label |
| `subheading-2` | 13px | 500 | 1.4 | Pill label, filter |
| `subheading-3` | 12px | 500 | 1.3 | Eyebrow, section label |
| `subheading-4` | 11px | 500 | 1.3 | Smallest strong label |

Use Tailwind utilities: `.body-2`, `.heading-4`, etc. Do not mix raw Tailwind `text-sm font-medium` — use the composed utilities.

### Rules

- **Never** set `font-size` outside the scale.
- **Never** use `font-weight: 800` or `900`. Max is `700`.
- **Never** set `letter-spacing` on body text — only on eyebrows/labels at `typography.letterSpacing.relaxed`.
- Line lengths must not exceed 72 characters for body copy. Enforce with `max-w` derived from `NOTES_MAX_WIDTH` (768px).

---

## Color

### Palette structure

All colors resolve through CSS custom properties in `globals.css`. The source of truth is `packages/ui/src/tokens/colors.ts`.

#### Backgrounds

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#ffffff` | Page root, feed backgrounds |
| `bg-surface` | `#f5f5f7` | Cards, panels, sidebar |
| `bg-elevated` | `#ffffff` | Modals, popovers (+ shadow to lift) |
| `bg-overlay` | `rgba(0,0,0,0.4)` | Backdrop behind sheets/modals |

#### Text

| Token | Usage |
|---|---|
| `text-primary` | All primary content — titles, body |
| `text-secondary` | Supporting content — descriptions, previews |
| `text-tertiary` | Meta — timestamps, labels, placeholder |
| `text-disabled` | Non-interactive text |

#### Borders

| Token | Opacity | Usage |
|---|---|---|
| `border-subtle` | 0.05 | Hairline dividers, card edges |
| `border-default` | 0.08 | Standard container borders |
| `border-strong` | 0.12 | Focused input ring base |

#### Accent

`#007AFF` — Apple system blue. Used for:
- Primary CTAs
- Focus rings
- Active/selected state highlights
- Links

**Never** use accent on destructive actions. Use `colors.semantic.destructive` (`#FF3B30`).

#### Emphasis scale

9 opacity levels (`emphasis.highest` → `emphasis.faint`) backed by `rgba(0,0,0,x)`. Used for layered surfaces, hover overlays, and pressed states — never for text.

#### Semantic

| Token | Value | Usage |
|---|---|---|
| `semantic.success` | `#34C759` | Confirmed, completed |
| `semantic.warning` | `#FF9500` | Caution, degraded |
| `semantic.destructive` | `#FF3B30` | Delete, error, danger |

### Rules

- **Never** use hex literals outside of `tokens/colors.ts`.
- **Never** use `opacity` to dim text — use the correct text tier token.
- **Never** use `gray-*` Tailwind palette directly — map to semantic tokens.
- Dark mode is **out of scope** until explicitly scoped. Do not add `dark:` variants speculatively.

---

## Spacing

### Grid

Primary grid: **8px**. Secondary grid: **4px** (for fine-tuning internal component spacing only).

| Token | Value |
|---|---|
| `spacing[1]` | 4px |
| `spacing[2]` | 8px |
| `spacing[3]` | 12px |
| `spacing[4]` | 16px |
| `spacing[5]` | 24px |
| `spacing[6]` | 32px |
| `spacing[7]` | 48px |
| `spacing[8]` | 64px |

### Rules

- **Never** use values outside this scale (e.g. `10px`, `6px`, `22px`).
- The one exception: `1px` for hairline borders.
- Component internal padding lives on `spacing[3]` (12px) or `spacing[4]` (16px). Never `spacing[1]` (too tight) or `spacing[5]` (too loose) for internal padding.
- Page-level padding: `spacing[4]` (mobile), `spacing[5]` (desktop).

---

## Elevation

Elevation is expressed via shadow + surface color together. A surface with a higher shadow must also have a higher `bg-*` token — never shadow a `bg-surface` card the same as a `bg-elevated` modal.

| Level | Shadow token | Surface | Use case |
|---|---|---|---|
| 0 | none | `bg-base` | Feed, page root |
| 1 | `shadows.low` | `bg-surface` | Cards, sidebar, panels |
| 2 | `shadows.medium` | `bg-elevated` | Dropdowns, tooltips, popovers |
| 3 | `shadows.high` | `bg-elevated` | Modals, sheets, command palette |

Shadow values:
- `shadows.low`: `0 2px 8px rgba(0,0,0,0.35)` (web) / RN object equivalent
- `shadows.medium`: `0 8px 24px rgba(0,0,0,0.45)`
- `shadows.high`: `0 20px 60px rgba(0,0,0,0.55)`

### Rules

- **Never** apply `shadows.high` to inline elements.
- **Never** mix elevation levels on a single surface (e.g. a `bg-surface` card with `shadows.high`).
- On mobile, use RN shadow object variants — **never** CSS box-shadow strings in native.

---

## Border Radius

| Token | Value | Usage |
|---|---|---|
| `radii.sm` | 6px | Badges, pills, small tags |
| `radii.md` | 10px | Buttons, input fields |
| `radii.lg` | 14px | Cards, feed items, stream rows |
| `radii.xl` | 20px | Panels, sheets, modals |
| `radii.icon` | 22% (web) / 20px (native) | App icons, avatar squares (squircle) |

### Rules

- **Never** use `rounded-full` on anything other than circular avatars or radio-style toggles.
- **Never** mix radius tiers on the same component (e.g. `radii.md` container with `radii.xl` children).
- Nested surfaces should use a radius one tier smaller than their parent.

---

## Motion

Motion is the highest-priority section of this document. Read it completely.

### Mandate

> **All interactive animations on web MUST use GSAP via `@hominem/ui/lib/gsap`.**

CSS keyframe animations (`animations.css`, `void-anim-*` classes) are reserved **exclusively** for Radix UI component enter/exit transitions. Do not add new CSS `@keyframes` for product surfaces under any circumstances.

On mobile, use `react-native-reanimated` with worklet-based animations. Never use `Animated` from React Native core.

### Why GSAP

- Frame-perfect sequencing via timelines — CSS cannot coordinate multi-element sequences reliably.
- Imperative control (kill, reverse, pause) required for gesture-driven interfaces.
- GSAP's `power*` easing family is physically correct in a way CSS `cubic-bezier` approximations are not.
- `reducedMotion()` guard is enforced centrally — CSS `prefers-reduced-motion` requires per-rule media queries that are easy to miss.

### Canonical sequences

Import from `@hominem/ui/lib/gsap`. **Never reimplement these locally.**

| Sequence | Function | When to use |
|---|---|---|
| Component arrives | `playFocusExpand(el, onComplete?)` | HyperForm mount, sheet open, panel reveal |
| Component leaves | `playFocusCollapse(el, onComplete?)` | HyperForm close, sheet dismiss |
| In-place mode switch | `playContextSwitch(el \| el[])` | HyperForm mode change, label swaps |
| Submit confirmation | `playSubmitPulse(btnEl, inputEl, onComplete?)` | Any form submit before clear |
| List row arrives | `playEnterRow(el, delay?)` | New note/chat in feed, sidebar item |
| List row leaves | `playExitRow(el, onComplete?)` | Deleted item removal |
| Loading skeleton | `playShimmer(el)` → returns tween | Skeleton states; `.kill()` on data resolve |

### Timing constants

Source: `packages/ui/src/tokens/motion.ts`. Do not hardcode duration values.

| Constant | Value | GSAP equivalent |
|---|---|---|
| `durations.enter` | 150ms | `GSAP_DURATION_ENTER` = 0.15 |
| `durations.exit` | 120ms | `GSAP_DURATION_EXIT` = 0.12 |
| `durations.standard` | 120ms | `GSAP_DURATION_STANDARD` = 0.12 |
| `durations.breezy` | 1800ms | Loop animations (shimmer, wave) |

### Easing

| Constant | CSS | GSAP | When |
|---|---|---|---|
| `easingWeb.enter` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | `power2.out` | Arriving elements |
| `easingWeb.exit` | `cubic-bezier(0.4, 0.0, 1, 1)` | `power2.in` | Departing elements |
| `easingWeb.standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | `power2.inOut` | In-place transitions |

For elastic/spring effects (e.g. swipe snap): `elastic.out(1, 0.5)`. Use sparingly — only for physical gesture completion.

### Translate distances

| Constant | Value | Direction |
|---|---|---|
| `translateDistances.enterY` | 6px | Elements arrive slightly from below |
| `translateDistances.exitY` | 4px | Elements depart slightly upward |

### Reduced motion

Every GSAP sequence in `sequences.ts` checks `reducedMotion()` before animating. If `true`, it instant-sets the final state via `gsap.set()` and calls `onComplete` immediately.

**Never bypass this guard.** Never add animations outside of sequences without implementing the guard.

### Stagger pattern

When multiple rows enter simultaneously (feed load, sidebar refresh):

```ts
elements.forEach((el, i) => playEnterRow(el, i * 0.04))
```

Maximum stagger: 5 items × 40ms = 200ms total cascade. Do not stagger more than 5 items — items beyond the fold should enter without delay.

### What CSS animation IS for

Only these interactions use `void-anim-*` CSS classes:
- Radix `Dialog` open/close
- Radix `Popover` open/close
- Radix `DropdownMenu` open/close
- Radix `Tooltip` enter/exit
- Radix `Sheet` slide in/out

Everything else: GSAP.

---

## Component Specifications

### Button

| Variant | Background | Text | Radius | Height | Padding X |
|---|---|---|---|---|---|
| Primary | `accent` (#007AFF) | white | `radii.md` (10px) | 40px | `spacing[4]` (16px) |
| Secondary | `bg-surface` | `text-primary` | `radii.md` | 40px | `spacing[4]` |
| Destructive | `semantic.destructive` | white | `radii.md` | 40px | `spacing[4]` |
| Ghost | transparent | `text-secondary` | `radii.md` | 36px | `spacing[3]` (12px) |
| Icon | transparent | `text-secondary` | `radii.sm` (6px) | 36px | 8px (square) |

**Touch target minimum: 44px × 44px.** A visually 36px button must have 4px invisible padding on each side to meet this.

States:
- **Hover**: `playEnterRow` is not used here — use CSS `transition: background-color 120ms ease`. This is the one exception to the GSAP mandate: button hover is CSS-only for performance.
- **Active/pressed**: `scale(0.97)` via GSAP on `pointerdown`, reversed on `pointerup`.
- **Disabled**: `opacity: 0.4`. Never change color, never add strikethrough. Cursor: `not-allowed`.
- **Loading**: Replace label with spinner. Never disable the button silently.
- **Focus-visible**: `outline: 2px solid #007AFF; outline-offset: 2px`. Always visible — never `outline: none` without replacement.

### Input / Textarea

| Property | Value |
|---|---|
| Border | `1px solid border-default` |
| Border focused | `2px solid accent` |
| Background | `bg-base` |
| Radius | `radii.md` (10px) |
| Padding | `spacing[3]` vertical, `spacing[4]` horizontal |
| Height (single-line) | 44px |
| Font | `body-1` (16px) — **minimum 16px on mobile to prevent iOS zoom** |

States:
- **Focused**: border upgrades to 2px accent. Transition: CSS 120ms (border only, not shadow).
- **Error**: border becomes `semantic.destructive`. Error message appears beneath using `body-4` in `semantic.destructive`.
- **Disabled**: `opacity: 0.5`, `cursor: not-allowed`, `pointer-events: none`.

### Card

| Property | Value |
|---|---|
| Background | `bg-surface` |
| Border | `1px solid border-subtle` |
| Radius | `radii.lg` (14px) |
| Shadow | `shadows.low` |
| Padding | `spacing[4]` (16px) |

Hover state: Background transitions to `emphasis.faint` overlay (CSS only, 120ms). No shadow change on hover — shadow changes are expensive and visually noisy.

### Sheet / Modal

| Property | Value |
|---|---|
| Background | `bg-elevated` |
| Radius (top) | `radii.xl` (20px) |
| Shadow | `shadows.high` |
| Backdrop | `bg-overlay` (`rgba(0,0,0,0.4)`) |
| Max width (modal) | 480px |
| Max height (sheet) | 90dvh |

Animation: Radix data-state attributes → `void-anim-*` CSS classes (sheet = slide up, modal = fade + scale from 0.95).

### Badge / Pill

| Property | Value |
|---|---|
| Background | `bg-surface` |
| Border | `1px solid border-subtle` |
| Radius | `radii.sm` (6px) |
| Padding | 2px 8px |
| Font | `subheading-3` (12px / 500) |

Accent badge: background `accent`, text white, no border. Used for counts, notifications.

---

## Interaction States

Every interactive element must implement all applicable states. Missing states are bugs.

| State | Visual treatment | Implementation |
|---|---|---|
| **Hover** | Subtle background shift via `emphasis.faint` | CSS `transition` 120ms |
| **Focus-visible** | `2px solid accent`, `outline-offset: 2px` | CSS `:focus-visible` |
| **Active / pressed** | `scale(0.97)` | GSAP `pointerdown` → `pointerup` |
| **Disabled** | `opacity: 0.4`, `cursor: not-allowed` | HTML `disabled` attr + CSS |
| **Loading** | Spinner replaces label; element dims to 0.6 | Component state |
| **Selected / active route** | Accent background + accent text | CSS class |
| **Error** | Destructive border + error message | Component state |

### Focus management rules

- **Never** suppress focus ring for mouse users unless you restore it for keyboard users via `:focus-visible`.
- Modals and sheets must trap focus (`aria-modal="true"`).
- On close, focus must return to the trigger element.
- Tab order must be logical — never use `tabIndex > 0`.

---

## Sizing and Touch Targets

### Touch targets

Minimum **44px × 44px** — Apple HIG and WCAG 2.5.5.
If the visual element is smaller, add invisible padding. Never reduce touch targets for visual density.

```css
/* Correct: 36px icon button with 44px touch target */
.icon-btn {
  width: 36px;
  height: 36px;
  padding: 4px; /* expands hit area to 44px */
}
```

### Icon sizing grid

| Context | Icon size | Token |
|---|---|---|
| Inline text (body) | 16px | `notesStream.typeIconSize` |
| Button / action | 20px | — |
| Navigation tab | 24px | — |
| Empty state / hero | 48px | — |

All icons: `lucide-react` (web), `@expo/vector-icons/Feather` (mobile). Never import icon sets not already in the dependency tree. Never use emoji as icons in UI chrome.

### Content max widths

| Context | Width | Token |
|---|---|---|
| Note / chat content | 768px | `NOTES_MAX_WIDTH` |
| Search overlay | 640px | `chatTokens.searchMaxWidth` |
| User chat bubble | 544px | `chatTokens.userBubbleMaxWidth` |
| Workspace aside | 416px | `NOTES_WORKSPACE_ASIDE_WIDTH` |

---

## Performance Rules

These are non-negotiable.

### Animations

- **Never animate `width`, `height`, `top`, `left`, `right`, `bottom`.** These trigger layout. Use `transform: translate/scale` exclusively.
- **Never animate `box-shadow`.** Use opacity on a pseudo-element shadow instead if a shadow must change.
- **Never use `will-change` speculatively.** Apply it immediately before an animation starts and remove it after.
- GSAP sequences run off the main thread where possible — do not block them with synchronous JS.
- Target 60fps. If an animation cannot hold 60fps on a mid-range device, remove it.

### Rendering

- Lists of more than 50 items must be virtualised (`react-window` or `FlashList` on mobile).
- Images must have explicit `width` and `height` to prevent layout shift (CLS).
- Never render markdown inside a `useEffect` — use a memoised component.
- `React.memo` on all stream/feed row components — they re-render on every query tick.

### Bundle

- Never import an entire icon library — use named imports only.
- Never import `lodash` — use native array/object methods.
- Lazy-load routes with `React.lazy` and `Suspense`.

---

## Platform Divergence

| Concern | Web | Mobile |
|---|---|---|
| Font | Geist | Inter |
| Animation | GSAP | react-native-reanimated |
| CSS | Tailwind + CSS custom properties | StyleSheet / NativeWind |
| Radii (icon) | `22%` (squircle) | `20px` (numeric) |
| Shadows | CSS `box-shadow` strings | RN shadow object |
| Safe area | CSS `env(safe-area-inset-*)` | `react-native-safe-area-context` |
| Touch targets | CSS padding | `hitSlop` prop |
| Viewport height | `100dvh` | `useWindowDimensions` |

Tokens in `packages/ui/src/tokens/` export both variants where they diverge — see `radii.ts` (`web` and `native` keys) and `shadows.ts` (`web` and `native` keys).

**Never use a web-only value in mobile code and vice versa.**

---

## File Locations

| Purpose | Path |
|---|---|
| Color tokens | `packages/ui/src/tokens/colors.ts` |
| Spacing tokens | `packages/ui/src/tokens/spacing.ts` |
| Typography tokens | `packages/ui/src/tokens/typography.ts` |
| Radii tokens | `packages/ui/src/tokens/radii.ts` |
| Shadow tokens | `packages/ui/src/tokens/shadows.ts` |
| Motion tokens | `packages/ui/src/tokens/motion.ts` |
| Notes-specific tokens | `packages/ui/src/tokens/notes.ts` |
| Chat-specific tokens | `packages/ui/src/tokens/chat.ts` |
| GSAP sequences | `packages/ui/src/lib/gsap/sequences.ts` |
| Global CSS | `packages/ui/src/styles/globals.css` |
| CSS animations (Radix only) | `packages/ui/src/styles/animations.css` |
| Token barrel | `packages/ui/src/tokens/index.ts` |
