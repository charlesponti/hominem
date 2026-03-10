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
- Keep animations light and purposeful.
- Do not use hover transforms or decorative interaction gimmicks that break the visual system.
- Use icons only when they communicate information.

## Troubleshooting

- Ensure `@hominem/ui/src/styles/globals.css` is imported at the app root.
- Verify token names directly in `packages/ui/src/styles/globals.css`.
- Prefer semantic classes over inline styles.
- Check `:focus-visible` and hover states in DevTools before adding one-off fixes.
- Keep spacing on the system scale and avoid arbitrary radius or accent values.

## Migration Rule

- Capture broad design migrations in OpenSpec changes instead of reviving standalone root docs.
