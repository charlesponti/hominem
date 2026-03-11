## Why

The app layer contains styling, interaction patterns, and component usage that does not align with the codified VOID design system (`.github/skills/design-system/SKILL.md`). This system establishes a unified philosophy of clarity, accessibility, and technical honesty across typography, spacing, color, focus states, motion, and icon usage. Aligning the app layer to these rules improves consistency, maintainability, and accessibility across all user-facing surfaces.

## What Changes

- Enforce single light mode only; remove all `dark:` utilities and color scheme switching.
- Replace raw hex/rgba values in app code with design tokens from `@hominem/ui/tokens/`.
- Replace ad-hoc transitions and custom keyframes with canonical animation primitives (web: `animations.css` classes; mobile: `motion.ts` constants and hooks).
- Remove hover transforms, decorative depth (shadows, blur, rounded corners used for ornament), and non-essential motion that does not clarify state.
- Audit and fix focus-visible states to meet WCAG 2.2 AA standards (4.5:1 contrast on text, 3:1 on interactive boundaries).
- Align typography: ensure body/prose text is ≥17px, use semantic typography scale, remove arbitrary font sizes.
- Audit icon usage: keep only icons that communicate information; replace decorative emojis with semantic meaning or remove.
- Ensure all motion respects `prefers-reduced-motion` via canonical animation rules.

## Capabilities

### New Capabilities

- `void-app-design-alignment`: Enforces VOID design system philosophy (clarity, accessibility, technical honesty) across app routing, component layout, styling, motion, and icon usage.

### Modified Capabilities

None.

## Impact

- Affected code: all app routes and components in `apps/*`, shared UI usage in `packages/ui/`, styling and motion patterns.
- Affected dependencies: none (rules use existing token system and animation primitives).
- Affected workflows: visual reviews, accessibility testing, design-driven development and verification.
- Expected outcome: app layer fully aligns with codified design system, improving visual consistency, accessibility, and developer clarity.
