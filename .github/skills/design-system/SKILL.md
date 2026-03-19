---
name: design-system
description: Use for app-layer visual and interaction work. Covers the repo’s monotone light design system, accessibility, and migration guardrails.
---

# Design System

## Philosophy

- Remove the non-essential.
- Use negative space as structure.
- Prefer understated clarity over decoration.
- Keep technical honesty over ornamental polish.

## Accessibility

- WCAG 2.2 AA throughout.
- Text contrast minimum `4.5:1`.
- Interactive boundaries minimum `3:1`.
- Visible `:focus-visible` states everywhere.
- Respect `prefers-reduced-motion`.
- Use semantic HTML.

## Core Rules

- Single light mode only.
- No raw hex or rgba values in app code.
- No decorative gradients, tints, blur-heavy treatments, or stray accent colors.
- Do not use `dark:` or `prefers-color-scheme: dark`.
- Use the design tokens and scale consistently for typography, spacing, radius, and depth.
- Never remove focus outlines without an equivalent visible replacement.
- Keep body and prose text at `17px` or above.
- Never use fixed-height text containers that break spacing overrides.
- Never use raw z-index integers.
- No decorative emojis. If an emoji would be used, use a semantic icon from the icon system instead, or remove it. Emojis are only acceptable when received from external data (user content, API responses) and rendered with `aria-hidden="true"`.

## Interaction Rules

- Motion should clarify, not decorate.
- All web components must animate in and out using GSAP canonical sequences. No ad-hoc CSS transitions.
- Do not use hover transforms or decorative interaction gimmicks that break the visual system.
- Use icons only when they communicate information.

## Typography Token Reference

Web apps use utility classes from `packages/ui/src/styles/globals.css`:

| Class | Size (clamp) | Weight | Use for |
|---|---|---|---|
| `display-1` | 2.5rem–6rem | bold | Hero / large display numbers |
| `display-2` | 2rem–3.5rem | bold | Section display |
| `heading-1` | 2.25rem–3rem | semibold | Page-level H1 |
| `heading-2` | 1.5rem–1.875rem | semibold | Section headings / page titles |
| `heading-3` | 1.125rem–1.25rem | semibold | Subsection headings |
| `heading-4` | 1rem–1.25rem | semibold | Component headings |
| `subheading-1` | 1.25rem–1.75rem | medium | Subheadings |
| `body-1` | 1rem–1.25rem | regular | Primary body text |
| `body-2` | 0.875rem–1rem | regular | Secondary body / descriptions |
| `body-3` | 0.75rem–0.875rem | regular | Small text / captions |
| `body-4` | 0.625rem–0.75rem | regular | Metadata / micro labels |

Never use raw Tailwind `text-xl`, `text-2xl`, `text-3xl`, `text-[x]` etc. for headings or body text — use the token classes above.

Mobile apps use Restyle `variant` prop on `<Text>`: `header`, `large`, `cardHeader`, `bodyLarge`, `body`, `title`, `label`, `caption`, `small`, `mono`. These map to the same visual scale.

## Color Token Reference

All colors come from `@hominem/ui/tokens/colors.ts` — the canonical source for web, mobile, and desktop. The design system uses a **light-mode-only palette aligned with Apple Human Interface Guidelines**.

### Backgrounds

| Token | Value | Use | WCAG Contrast (against primary text) |
|-------|-------|-----|------|
| `bg-base` | `#ffffff` | Primary view background | ✓ 21:1 |
| `bg-surface` | `#f5f5f7` | Secondary surfaces, cards, panels | ✓ 19:1 |
| `bg-elevated` | `#f2f2f7` | Tertiary surfaces, modals, elevation | ✓ 18.5:1 |
| `bg-overlay` | `rgba(0, 0, 0, 0.04)` | Subtle overlay for hover/focus states | — |

### Foreground Text

| Token | Value | Use | WCAG Contrast |
|-------|-------|-----|------|
| `text-primary` | `#000000` | Main text, labels, headings | ✓ 21:1 |
| `text-secondary` | `#555555` | Subtext, secondary descriptions | ✓ 7.1:1 |
| `text-tertiary` | `#888888` | Metadata, captions, less important text | ✓ 4.5:1 |
| `text-disabled` | `#cccccc` | Disabled controls, inactive state | ✓ 3.2:1 (⚠️ use sparingly for non-critical UI) |

### Borders & Separators

| Token | Value | Use |
|-------|-------|-----|
| `border-default` | `rgba(0, 0, 0, 0.1)` | Default borders, separators |
| `border-subtle` | `rgba(0, 0, 0, 0.05)` | Subtle dividers, low-emphasis lines |
| `border-focus` | `rgba(0, 0, 0, 0.15)` | Focus rings, interactive indicators |

### Semantic Status (Apple System Colors)

| Token | Value | Use |
|-------|-------|-----|
| `success` | `#34c759` | Success states, positive feedback |
| `warning` | `#ff9500` | Warnings, caution feedback |
| `destructive` | `#ff3b30` | Errors, destructive actions |

### Accent (Brand Color)

| Token | Value | Use |
|-------|-------|-----|
| `accent` | `#007AFF` | Primary button actions, links, focus indicators, accent highlights |
| `accent-foreground` | `#ffffff` | Text/icon on accent backgrounds |

### Emphasis Scale (Opacity-Based)

For subtle variations in visual hierarchy, use the emphasis scale. All values are opacities of black (`rgba(0, 0, 0, x)`):

| Token | Value | Use |
|-------|-------|-----|
| `emphasis-highest` | `rgba(0, 0, 0, 0.9)` | Strongest emphasis, near-black |
| `emphasis-high` | `rgba(0, 0, 0, 0.7)` | High emphasis |
| `emphasis-medium` | `rgba(0, 0, 0, 0.5)` | Medium emphasis |
| `emphasis-low` | `rgba(0, 0, 0, 0.3)` | Low emphasis |
| `emphasis-lower` | `rgba(0, 0, 0, 0.2)` | Lower emphasis |
| `emphasis-subtle` | `rgba(0, 0, 0, 0.15)` | Subtle emphasis |
| `emphasis-minimal` | `rgba(0, 0, 0, 0.1)` | Minimal emphasis |
| `emphasis-faint` | `rgba(0, 0, 0, 0.05)` | Faint emphasis, nearly invisible |

### Icon Colors

| Token | Value | Use |
|-------|-------|-----|
| `icon-primary` | `#000000` | Primary icons |
| `icon-muted` | `#888888` | Secondary, muted icons |

### Sidebar (Kanso Monochrome)

| Token | Value | Use |
|-------|-------|-----|
| `sidebar` | `#000000` | Sidebar background |
| `sidebar-foreground` | `#ffffff` | Sidebar text |
| `sidebar-primary` | `#ffffff` | Sidebar primary text |
| `sidebar-primary-foreground` | `#000000` | Text on sidebar primary |
| `sidebar-accent` | `rgba(255, 255, 255, 0.15)` | Sidebar accent background |
| `sidebar-accent-foreground` | `#ffffff` | Text on sidebar accent |
| `sidebar-border` | `rgba(255, 255, 255, 0.1)` | Sidebar borders |
| `sidebar-ring` | `#ffffff` | Sidebar focus ring |

## Cross-Platform Parity

Web and mobile must render identically for the same content and affordances. Strategy:

- The web component is the visual spec. Mobile implements it faithfully using RN primitives.
- Do not share DOM components with mobile — build a matching RN equivalent instead.
- Animation timing must match: web CSS duration ↔ mobile `VOID_MOTION_DURATION_STANDARD` constant.
- Color tokens come from the same source (`@hominem/ui/tokens`) on both platforms.
- Platform-specific exceptions (gestures, safe area, tab bar) must be documented in component code with a comment.

## Animation Primitives

### Web (GSAP)

All web animations use **GSAP**. No app-level `@keyframes`, no CSS `transition:` inline styles, and no `.void-anim-*` utility classes on web. GSAP is the single animation authority.

**Canonical sequences (defined in `packages/ui/src/lib/gsap/sequences.ts`):**

| Sequence | Use |
|---|---|
| `focusExpand` | Component expanding into view (e.g. HyperForm open) |
| `focusCollapse` | Component collapsing out of view (e.g. HyperForm close) |
| `contextSwitch` | In-place label/content transition when context changes |
| `submitPulse` | Brief pulse on submit before the form clears |
| `enterRow` | One-shot enter for a newly rendered list row |
| `exitRow` | Exit for a list row being removed |
| `shimmer` | Repeating shimmer for loading states |

**Timing constants (use these — never hardcode ms values):**

| Constant | Value | Use |
|---|---|---|
| `GSAP_DURATION_ENTER` | `0.15` | Component appearing |
| `GSAP_DURATION_EXIT` | `0.12` | Component disappearing |
| `GSAP_DURATION_STANDARD` | `0.12` | State/content transitions |
| `GSAP_EASE_ENTER` | `"power2.out"` | Decelerate on enter |
| `GSAP_EASE_EXIT` | `"power2.in"` | Accelerate on exit |
| `GSAP_EASE_STANDARD` | `"power2.inOut"` | State transitions |

**Rules:**
- Always use `gsap.context()` scoped to the component ref to prevent leaks.
- Clean up with the returned `ctx.revert()` in the component's unmount/cleanup.
- Respect `prefers-reduced-motion`: check `window.matchMedia('(prefers-reduced-motion: reduce)')` and set `gsap.globalTimeline.timeScale(0)` or skip non-essential sequences.
- Never animate properties that affect layout (width, height, padding) — animate `opacity` and `transform` only.

### Mobile (`apps/mobile/theme/motion.ts`)

- `VOID_MOTION_ENTER` = 150ms — use for component enter.
- `VOID_MOTION_EXIT` = 120ms — use for component exit.
- `VOID_MOTION_DURATION_STANDARD` = 120ms — use for content/state animations.
- `VOID_EASING_ENTER` = `Easing.out(Easing.cubic)` — decelerate.
- `VOID_EASING_EXIT` = `Easing.in(Easing.cubic)` — accelerate.
- `VOID_EASING_STANDARD` = `Easing.inOut(Easing.ease)` — for state transitions.
- Translate: `VOID_ENTER_TRANSLATE_Y` (6px), `VOID_EXIT_TRANSLATE_Y` (4px).

Reusable hooks in `apps/mobile/components/animated/fade-in.tsx`:
- `FadeIn` component — wraps children in canonical enter animation.
- `useVoidEnter()` — enter hook for manual control.
- `useVoidExit()` — exit hook with optional `onComplete` callback.

## Troubleshooting

- Ensure `@hominem/ui/src/styles/globals.css` is imported at the app root.
- Verify token names directly in `packages/ui/src/styles/globals.css`.
- Prefer semantic classes over inline styles.
- Check `:focus-visible` and hover states in DevTools before adding one-off fixes.
- Keep spacing on the system scale and avoid arbitrary radius or accent values.

## Code Review Checklist

When reviewing a PR that touches UI code, verify:

**Colors**
- [ ] No raw hex/rgba in JSX or StyleSheet — only token imports or CSS variables
- [ ] No `dark:` classes or `prefers-color-scheme: dark` usage

**Typography**
- [ ] Web headings use `heading-1`–`heading-4`, `display-1`–`display-2` (not `text-2xl` etc.)
- [ ] Body text uses `body-1`–`body-4` (not `text-sm`, `text-base`, `text-lg`)
- [ ] Mobile `<Text>` uses `variant` prop — no inline `fontSize` overrides
- [ ] No arbitrary `text-[x]` bracket notation

**Motion**
- [ ] Web: animations use GSAP canonical sequences from `packages/ui/src/lib/gsap/sequences.ts` — no `@keyframes`, no `.void-anim-*`, no inline `transition:`
- [ ] Web: GSAP timing uses `GSAP_DURATION_*` and `GSAP_EASE_*` constants — no hardcoded ms or easing strings
- [ ] Web: `gsap.context()` is scoped to a component ref and cleaned up on unmount
- [ ] Web: `prefers-reduced-motion` is respected (skip or instant-complete non-essential sequences)
- [ ] Mobile: animations use `VOID_MOTION_DURATION_STANDARD` / `VOID_EASING_STANDARD` — no hardcoded ms values
- [ ] No `transform: scale()` or `transform: translateY()` on hover/press for decoration

**Icons and Emojis**
- [ ] No decorative emojis in JSX or string literals
- [ ] Icons used only where they communicate information (not decoration)

**Accessibility**
- [ ] All interactive elements have visible `:focus-visible` state
- [ ] `<button>` not `<div onClick>`, `<a>` not `<span onClick>`
- [ ] Text contrast ≥4.5:1, interactive boundaries ≥3:1

**Cross-platform**
- [ ] Platform-specific behavior (gestures, safe area) is documented in a comment

## Migration Rule

- Capture broad design migrations in OpenSpec changes instead of reviving standalone root docs.
