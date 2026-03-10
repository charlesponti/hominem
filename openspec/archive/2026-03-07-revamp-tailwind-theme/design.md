## Context

All applications currently import a single `globals.css` from `packages/ui` that contains:

- a huge `@theme` block defining dozens of `--color-…` variables and other tokens
- layers of hand‑written utilities (`.text-primary`, `.btn`, `.ma-xl`) that duplicate
  or bypass Tailwind’s own classes
- design philosophy comments about “VOID” and Japanese minimalism embedded in CSS

There is no `tailwind.config.js/ts` at the root of the repo; every app passes the
`@tailwindcss/vite` plugin and points its `globals.css` at `packages/ui` with a
`@source` comment so Tailwind can scan for classes. The result is a system with
poor discoverability, no TypeScript support for tokens, and no pathway to a
light‑mode or multiple themes.

The mobile app uses a completely separate theme built with `@shopify/restyle`,
meaning tokens are duplicated there as well.

The team wants a clean starting point that follows Apple design guidelines—
emphasis on spacing, legibility, subtle motion—and remains dark‑mode only for
now. That means producing a Tailwind theme that behaves like a design system
foundation rather than a monolith of CSS art.

## Goals / Non-Goals

**Goals**

- Build a first-class Tailwind configuration exporting typed theme tokens
- Centralize colors, spacing, fonts, radii, etc. in `packages/ui` and reuse in
  mobile when feasible
- Keep the theme dark‑mode only initially but leave room for future light mode
  (e.g. by using `dark:` variants or a `class` strategy)
- Provide a small set of sanctioned component utilities (`.btn`) with a
  predictable prefix/namespace
- Enable type-safe usage across the codebase via a generated `theme.ts`
- Remove the in‑CSS design commentary; move principles to docs in `docs/` or
  `packages/ui/README.md`
- Keep existing apps working with minimal visual diffs while refactoring class
  names gradually

**Non-Goals**

- Implementing a light theme in this phase
- Changing brand colours or aesthetics beyond dark‑mode Apple styling
- Touching mobile `@shopify/restyle` theme in detail (may be a follow-up)
- Adding complex design‑system tooling (Figma tokens, storybook, etc.)

## Decisions

### 1. Use Tailwind Configuration as Single Source of Truth

**Choice**: Create `packages/ui/tailwind.config.ts` containing `theme.extend`
for colours, spacing, fontFamily, borderRadius, keyframes etc.

**Rationale**: Tailwind’s theming API is designed for exactly this; it also
provides JIT compilation, purge scanning, and TypeScript plugins. Duplication
in `globals.css` would only reintroduce the existing mess.

### 2. Dark‑Mode Only with `class="dark"` Strategy

**Choice**: Configure Tailwind’s `darkMode: 'class'` and ship a `<body class="dark">`.

**Rationale**: We want a strict dark aesthetic but anticipate future light mode; a
class approach makes toggling easier later and plays nicely with `prefers-color-scheme`.

### 3. Namespace Custom Utilities (prefix `void-`)

**Choice**: Set `prefix: 'void-'` in `tailwind.config.ts` and adapt existing
utilities accordingly (e.g. `.void-btn`).

**Rationale**: Prevents collisions with built-in Tailwind classes and signals
which utilities are part of our design system. It also aligns with the existing
`void-anim-*` names.

### 4. Split Styles into Multiple Files

**Choice**: Replace `globals.css` with:

```
packages/ui/src/styles/
  tokens.css    # CSS variables and :root
  base.css      # resets, typography rules
  utilities.css # Tailwind @layer utilities for tiny number of custom cases
  components/   # individual component styles if needed
```

**Rationale**: Improves maintainability and makes it straightforward for Tailwind
to scan only the relevant files.

### 5. Generate TypeScript Tokens

**Choice**: Add a small script or Vite plugin to output `packages/ui/src/theme.ts`
exporting the `theme` object with typed utilities based on `tailwind.config.ts`.

**Rationale**: Developers can `import { theme } from '@hominem/ui'` and get
autocomplete for colors/spacing instead of memorizing classnames.

## Risks / Trade-offs

- **Migration effort**: Changing class names across apps may be time consuming.
  We mitigate by keeping both old and new classes working via a transitional
  alias layer.
- **Dark‑mode only**: Some users or designers may request light mode sooner than
  expected; having everything class‑scoped mitigates this risk.
- **Schema drift**: New tokens must be added to both Tailwind and mobile theme.
  We'll document a process for synchronizing or consider a shared JSON file in
  later phases.

## Migration Plan
1. Create `tailwind.config.ts` with initial Apple‑styled tokens.
2. Add `prefix: 'void-'` and set `darkMode: 'class'`.
3. Split `globals.css` into tokens/base/utilities and update imports.
4. Update apps’ globals.css to reference new token files.
5. Add transitional aliases (e.g. `.text-primary { @apply text-void-primary; }`).
6. Replace occurrences of old classes incrementally; use `grep` to track.
7. Add theme export script and update components to import tokens where needed.
8. Delete or archive original `globals.css` once migration complete.

## Open Questions

1. Should mobile reuse tokens by importing `tailwind.config.ts` or via a JSON
   dump?
2. Do we want to keep the “terminal cursor” and uppercase typography from the
   old design, or tone them down for Apple realism?
3. Are there any existing components that rely on the `crosshair` cursor or
   other quirky rules we need to ship as utilities?
4. How aggressive should we be about removing the `@theme` variables vs keeping
   them for an interim period?
