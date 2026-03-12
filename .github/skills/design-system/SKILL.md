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
- All components must animate in and out. Use the canonical primitives — no ad-hoc transitions.
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

## Cross-Platform Parity

Web and mobile must render identically for the same content and affordances. Strategy:

- The web component is the visual spec. Mobile implements it faithfully using RN primitives.
- Do not share DOM components with mobile — build a matching RN equivalent instead.
- Animation timing must match: web CSS duration ↔ mobile `VOID_MOTION_DURATION_STANDARD` constant.
- Color tokens come from the same source (`@hominem/ui/tokens`) on both platforms.
- Platform-specific exceptions (gestures, safe area, tab bar) must be documented in component code with a comment.

## Animation Primitives

### Web (`packages/ui/src/styles/animations.css`)

**Enter/exit (component lifecycle):**
- `.void-anim-enter` — 150ms, decelerate. Use for components appearing.
- `.void-anim-exit` — 120ms, accelerate. Use for components disappearing.
- Directional variants: `.void-anim-enter-top`, `.void-anim-enter-bottom`, `.void-anim-enter-left`, `.void-anim-enter-right` (and matching exit variants) — use for positioned elements (dropdowns, tooltips, sheets).
- Radix UI `data-[state=open/closed]` attributes are wired automatically.

**Content animations (in-situ, not enter/exit):**
- `.void-anim-breezy` — one-shot wave, for newly rendered content rows.
- `.void-anim-breezy-loop` — repeating wave, for loading states.
- `.void-anim-breezy-progress` — horizontal shimmer, for progress indicators.
- `.void-anim-breezy-stagger` — staggered wave on children, for thinking dots.

No app-level `@keyframes` allowed. All animation through these utility classes.

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
- [ ] Web: animations use `.void-anim-*` classes only — no custom `@keyframes` or `transition:` inline
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
