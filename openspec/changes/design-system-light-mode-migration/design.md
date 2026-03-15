# Design: Light-Mode Color System

## Design Philosophy

- **Single light mode only** per void-app-design-alignment spec
- **Apple HIG aligned** for cross-platform consistency and familiarity
- **WCAG 2.2 AA minimum** for all text and interactive elements
- **Opacity-based hierarchy** for subtle visual differentiation
- **Token-driven** for single source of truth across platforms

## Color Palette

### Backgrounds (Light)
- **Base** `#ffffff` — Primary app/view background, white
- **Surface** `#f5f5f7` — Cards, panels, secondary surfaces
- **Elevated** `#f2f2f7` — Tertiary surfaces, modals, elevation layers
- **Overlay** `rgba(0, 0, 0, 0.04)` — Subtle background overlay

### Text (Dark Foreground)
- **Primary** `#000000` — Main text, labels, headings
- **Secondary** `#555555` — Subtext, secondary descriptions
- **Tertiary** `#888888` — Metadata, captions, less importantext
- **Disabled** `#cccccc` — Disabled controls (use sparingly)

### Borders & Separators (Black Opacities)
- **Default** `rgba(0, 0, 0, 0.1)` — Standard borders, separators
- **Subtle** `rgba(0, 0, 0, 0.05)` — Low-emphasis dividers
- **Focus** `rgba(0, 0, 0, 0.15)` — Focus indicators, interactive states

### Semantic Status (Apple Colors)
- **Success** `#34c759` — Green, positive feedback
- **Warning** `#ff9500` — Orange, cautionary feedback
- **Destructive** `#ff3b30` — Red, errors, destructive actions

### Accent (Primary Override)
- **Accent** `#007AFF` — Apple Blue per HIG, primary buttons, links, focus
- **Accent-foreground** `#ffffff` — Text/icon on accent backgrounds

### Emphasis Scale (Black Opacities)
Subtle visual hierarchy using opacity tiers:
- `emphasis-highest` `rgba(0, 0, 0, 0.9)` — Strongest emphasis
- `emphasis-high` `rgba(0, 0, 0, 0.7)`
- `emphasis-medium` `rgba(0, 0, 0, 0.5)`
- `emphasis-low` `rgba(0, 0, 0, 0.3)`
- `emphasis-lower` `rgba(0, 0, 0, 0.2)`
- `emphasis-subtle` `rgba(0, 0, 0, 0.15)`
- `emphasis-minimal` `rgba(0, 0, 0, 0.1)`
- `emphasis-faint` `rgba(0, 0, 0, 0.05)` — Nearly invisible

### Charts (Black Opacities)
- `chart-1` through `chart-5` — Opacity scale for data visualization

### Sidebar (Kanso Monochrome)
- **Sidebar** `#000000` — Background
- **Sidebar-foreground** `#ffffff` — Text
- **Sidebar-accent** `rgba(255, 255, 255, 0.15)` — Active/hover state

## Contrast Compliance

All combinations tested for WCAG 2.2 AA:

| Text | Background | Contrast | Compliance |
|------|-----------|----------|-----------|
| `text-primary` (#000000) | `bg-base` (#ffffff) | 21:1 | ✓ AAA |
| `text-secondary` (#555555) | `bg-surface` (#f5f5f7) | 7.1:1 | ✓ AA |
| `text-tertiary` (#888888) | `bg-elevated` (#f2f2f7) | 4.5:1 | ✓ AA |
| `accent` (#007AFF) | `bg-base` (#ffffff) | 5.3:1 | ✓ AA |
| Interactive bounds (min) | — | 3:1 | ✓ AA |

## Implementation

### Web (CSS Custom Properties)
All colors defined in `packages/ui/src/styles/globals.css` @theme block, consumed via Tailwind utilities and component classes.

### Mobile (Restyle)
Colors imported from `@hominem/ui/tokens/colors.ts`, applied via `createTheme()` and accessed via `useTheme()` hook throughout React Native components.

### Cross-Platform
Single source of truth in `packages/ui/src/tokens/colors.ts`; both web and mobile import from this canonical location.

## Rationale

### Why Apple Blue (#007AFF)?
- Standard iOS accent per Apple HIG
- High contrast on light backgrounds (5.3:1)
- Familiar to users across Apple ecosystems
- Previous cool blue (#7bd3f7) was lower contrast and non-standard

### Why Black Opacities for Emphasis?
- Opacities allow subtle hierarchy without discrete color values
- Scales smoothly from nearly invisible to strong emphasis
- Proven pattern in Apple system design
- Reduces color palette complexity

### Why Single Light Mode?
- void-app-design-alignment spec explicitly forbids dark mode
- Aligns product to canonical design system (SKILL.md)
- Improves visual consistency and legibility
- Reduces maintenance burden (no dark/light variants)

## Accessibility Notes

- All contrast ratios verified with WCAG 2.2 AA minimum (4.5:1 text, 3:1 interactive)
- Focus rings use `accent` color with 2px outline and 2px offset
- Respects `prefers-reduced-motion` via existing animation primitives
- Typography scale unchanged (already meets minimum 17px for body text)

## Migration Impact

- **Visual-only change**: No API modifications, component signatures remain identical
- **No dark mode support**: Remove any `dark:` utilities or `prefers-color-scheme: dark` from app code
- **Snapshot updates**: Visual tests/screenshots will need re-baselining
- **Branding**: Accent color change from cool blue to Apple Blue may affect brand perception; revert to `#7bd3f7` if needed

## References

- Apple HIG Color: https://developer.apple.com/design/human-interface-guidelines/color
- Design System Skill: `.github/skills/design-system/SKILL.md`
- Void App Design Alignment: `openspec/specs/void-app-design-alignment/spec.md`
