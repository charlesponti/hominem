## Why

The app layer contains styling, interaction patterns, and component usage that does not align with the codified VOID design system (`.github/skills/design-system/SKILL.md`). This system establishes a unified philosophy of clarity, accessibility, and technical honesty across typography, spacing, color, focus states, motion, and icon usage. Additionally, the three user-facing apps (mobile, desktop web, and notes web) are not aligned 1-1 with each other—they diverge in visual presentation, component styling, interaction patterns, and motion behavior. This change addresses both issues: enforcing design system compliance globally, and achieving perfect 1-1 visual and interaction alignment across all three platforms.

## What Changes

- Enforce single light mode only; remove all `dark:` utilities and color scheme switching across all apps.
- Replace raw hex/rgba values in app code with design tokens from `@hominem/ui/tokens/` consistently across mobile, desktop, and notes.
- Replace ad-hoc transitions and custom keyframes with canonical animation primitives (web: `animations.css` classes; mobile: `motion.ts` constants and hooks) on all platforms.
- Remove hover transforms, decorative depth (shadows, blur, rounded corners used for ornament), and non-essential motion that does not clarify state, uniformly across platforms.
- Audit and fix focus-visible states to meet WCAG 2.2 AA standards (4.5:1 contrast on text, 3:1 on interactive boundaries) on all platforms.
- Align typography: ensure body/prose text is ≥17px, use semantic typography scale, remove arbitrary font sizes consistently across mobile, desktop, and notes.
- Audit icon usage: keep only icons that communicate information; replace decorative emojis with semantic meaning or remove, uniformly across all apps.
- Ensure all motion respects `prefers-reduced-motion` via canonical animation rules on all platforms.
- **Achieve perfect 1-1 design alignment across mobile, desktop web, and notes web apps**: identical visual hierarchy, spacing, typography rendering, focus states, motion timing, color application, and interaction feedback on all three platforms.

## Capabilities

### New Capabilities

- `void-app-design-alignment`: Enforces VOID design system philosophy (clarity, accessibility, technical honesty) across app routing, component layout, styling, motion, and icon usage.

### Modified Capabilities

None.

## Impact

- Affected code: all app routes and components in `apps/mobile/`, `apps/notes/`, `apps/rocco/`, and `apps/finance/`; shared UI usage in `packages/ui/`; styling and motion patterns.
- Affected dependencies: none (rules use existing token system and animation primitives).
- Affected workflows: visual reviews, cross-platform accessibility testing, design-driven development and verification, mobile and web parity testing.
- Expected outcome: app layer fully aligns with codified design system, all three platforms achieve visual/interaction parity, improving user experience consistency and developer clarity.
