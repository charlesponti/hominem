## Why

The current design system is a monolithic CSS file full of hand‑rolled utilities, global variables, and philosophical commentary. It bypasses Tailwind’s configuration system entirely, resulting in:
- no theme or token typing
- inconsistent naming conventions and clashing class names
- impossible dark/light theming or modularization
- a brittle, impenetrable starting point for designers and developers

We need a clean, Apple-style design starting point that leverages Tailwind’s built‑in theming, keeps tokens centralized, and remains dark‑mode only to match our current aesthetic. This will make the UI easier to reason about, maintain, and evolve.

## What Changes

- Introduce a proper `tailwind.config.ts` in `packages/ui` defining colors, spacing, radii, fonts etc.
- Split existing `globals.css` into a small set of token, base, utility and component files.
- Migrate current apps to use Tailwind theme tokens and utilities instead of custom classes like `text-primary`.
- Provide a dark‑mode‑only theme matching Apple design guidelines (sanity of typography, spacing, motion).
- Prefix or namespace any remaining custom utilities to avoid Tailwind collisions (e.g. `void-` prefix).
- Remove philosophical prose from CSS and document design principles in markdown.

### New Capabilities

- `tailwind-theme`: A typed, extensible Tailwind theme exported from `packages/ui`.
- `design-tokens`: Centralized color/spacing/font tokens usable in both web and mobile packages.

### Modified Capabilities

- `ui-components`: Components will consume the new theme tokens and utilities
- `apps/*`: Upgrade CSS imports and class names to the new system.

## Impact

- **packages/ui**: Major refactor of styles, new config, new file structure
- **apps/***: Build changes to enable scanning new files, updates to classnames
- **Workflow**: Developers will need to reference `tailwind.config.ts` or theme types
- **Design**: Collaboration with designers will be easier with exported tokens


