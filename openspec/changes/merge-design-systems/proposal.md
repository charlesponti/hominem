## Why

The current VOID design system is being completely replaced with a unified, premium dark mode design system that combines the best practices from Ponti Studios (opacity-based elevation, off-white foreground), Apple's Human Interface Guidelines (semantic typography, adaptive spacing), and a refined aesthetic that emphasizes simplicity, legibility, and developer-native polish. This change establishes a cohesive visual language across all Ponti Studios products (Kuma, Jinn, Void, Revrock, Atlas).

## What Changes

- **Complete removal** of the existing VOID design system CSS variables, tokens, and utilities
- **Introduction** of a unified dark mode palette with off-black backgrounds (`#0F1113`, `#14171A`, `#1A1E22`) and off-white foreground (`#E7EAEE`)
- **Typography system** based on Apple's SF Pro strategy with Inter for UI and JetBrains Mono for code/technical content
- **Opacity-based elevation system** replacing the previous sharp contrast approach (uses `rgba(255,255,255,X)` for surfaces and emphasis levels)
- **Spacing system** based on 8px and 4px grids aligned with Apple's guidelines
- **Border and shadow tokens** optimized for subtle, premium feel with minimal decoration
- **Per-product accent colors** (Kuma: warm ivory, Jinn: violet, Void: cool blue, Revrock: amber, Atlas: teal) applied sparingly to highlights, graphs, and active states
- **Removal of**: Japanese minimalism philosophy naming (kanso, ma, wabi-sabi), monospace-only mandate, ASCII texture utilities, `transition: none !important` global restriction, sharp corners
- **Addition of**: Smooth transitions and interactions, rounded corners (`radius-sm` through `radius-xl`), semantic color naming, accessibility-focused contrast, modern glass-morphism utilities

## Capabilities

### New Capabilities

- `unified-dark-design-system`: Complete color palette, typography, spacing, and component token system that unifies Ponti Studios products under a premium dark aesthetic
- `semantic-color-tokens`: Functional color names (primary, secondary, background, surface, elevated) that adapt for dark mode and enable per-product theming
- `apple-inspired-typography`: SF Pro-based typography system with dynamic sizing scales, proper line heights, and letter spacing for optimal legibility
- `opacity-elevation-system`: Elevation and differentiation via white opacity layers instead of color shifts, creating premium subtle depth
- `tailwind-design-tokens`: Tailwind CSS v4 theme configuration with CSS custom properties for all tokens (colors, spacing, typography, shadows)
- `component-utility-classes`: Unified utility classes for buttons, cards, inputs, and common UI patterns across all products

### Modified Capabilities

- `design-system-void`: Completely replaced with new unified system

## Impact

- **Affected files**: 
  - `packages/ui/global.css` - Complete rewrite of design token system
  - All component files in `packages/ui` and app-specific UI directories
  - Tailwind configuration files (`tailwind.config.ts`) in all packages
  - Component utility classes and CSS modules across all apps
- **Affected packages**: `@hominem/ui`, `apps/kuma`, `apps/jinn`, `apps/void`, `apps/revrock`, `apps/atlas`
- **Breaking changes**: 
  - All existing CSS classes and token references will change
  - Component styling will require review and updates across all products
  - Dark mode is now the only supported theme
- **Dependencies**: Requires Inter and JetBrains Mono font declarations (can use system fallbacks)
- **No database or API changes**: Purely visual/styling layer
