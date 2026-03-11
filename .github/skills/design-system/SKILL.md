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

## Interaction Rules

- Motion should clarify, not decorate.
- All components must animate in and out. Use the canonical primitives — no ad-hoc transitions.
- Do not use hover transforms or decorative interaction gimmicks that break the visual system.
- Use icons only when they communicate information.

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

## Migration Rule

- Capture broad design migrations in OpenSpec changes instead of reviving standalone root docs.
