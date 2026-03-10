## Context

The hominem monorepo contains multiple product applications (Kuma, Jinn, Void, Revrock, Atlas) currently using a VOID design system based on Japanese minimalism principles, monospace-only typography, pure black backgrounds, and a `transition: none !important` global restriction. This system is being completely replaced with a modern, unified dark-mode design system that prioritizes:

- Premium, subtle visual hierarchy via opacity layers (not color shifts)
- Off-white foreground (`#E7EAEE`) and off-black backgrounds (`#0F1113`, `#14171A`, `#1A1E22`)
- Apple Human Interface Guidelines principles (semantic tokens, proper typography, adaptive spacing)
- Per-product accent colors for visual differentiation while maintaining system cohesion
- Smooth interactions and transitions (replacing instant state changes)

The implementation is Tailwind CSS v4 with CSS custom properties, providing both semantic token access and full utility class coverage.

## Goals / Non-Goals

**Goals:**

1. Create a complete, reusable design system that works across all Ponti Studios products
2. Establish a single source of truth for tokens (colors, typography, spacing, shadows, radii)
3. Enable per-product accent color theming without breaking system cohesion
4. Provide migration path from VOID system to new system with clear utility class mappings
5. Support both dark mode (primary) with accessibility standards (WCAG AA minimum contrast)
6. Document token usage patterns and component guidelines for consistency
7. Support modern interactions (smooth transitions, hover states, focus states)

**Non-Goals:**

- Light mode support (dark only)
- Custom SVG/icon system changes (tokens only)
- Migration of existing component implementations (components stay as-is, tokens change)
- Animation/motion design beyond standard transitions
- Responsive behavior changes (maintain current breakpoints)

## Decisions

### Decision 1: Tailwind CSS v4 with CSS Custom Properties (not raw CSS)

**Choice:** Use Tailwind CSS v4's `@theme` directive with CSS custom properties instead of hardcoding values in utilities.

**Rationale:**
- CSS custom properties enable runtime theme switching per-product if needed in future
- Tailwind v4's `@theme` is the modern pattern for token management
- Allows components to reference tokens directly (`var(--color-bg-base)`) or via utilities (`bg-bg-base`)
- Familiar to team already using Tailwind
- Provides both escape hatch (CSS vars) and type-safe utilities

**Alternatives considered:**
- Raw CSS + no theming: Too rigid, makes per-product accents hard to maintain
- Shadcn-style CSS variables only: Less integrated with Tailwind, more boilerplate
- Runtime theme system (CSS-in-JS): Adds complexity, no clear win for dark-only system

### Decision 2: Opacity-Based Elevation (not separate color layers)

**Choice:** Use white overlays with opacity (`rgba(255,255,255,X)`) for surface elevation and emphasis, not separate background colors.

**Rationale:**
- Creates premium, subtle depth without introducing new colors
- Matches modern design tools (Linear, Vercel, Raycast)
- Single palette easier to maintain
- Works well with off-black base (`#0F1113`)
- Produces glass-morphism effect naturally

**Alternatives considered:**
- Multiple background colors (#0F1113, #14171A, #1A1E22 as distinct colors): Creates visual discontinuity
- Shadow-only elevation: Insufficient on dark backgrounds, less readable

### Decision 3: Typography: Inter (UI) + JetBrains Mono (code) with SF Pro fallback strategy

**Choice:** 
- Primary: `Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Code: `JetBrains Mono, 'SF Mono', monospace`

**Rationale:**
- Inter designed specifically for UI, excellent readability at all sizes
- JetBrains Mono standard in developer tools
- System font fallback provides SF Pro on Apple devices (matching Apple HIG intent without requiring font files)
- Reduces font loading dependencies
- SF Pro fallback gives premium feel on Apple platforms without explicit request

**Alternatives considered:**
- Force SF Pro via @font-face: Adds complexity, licensing concerns, slower load
- Geist Mono only (previous system): Incompatible with modern typography standards

### Decision 4: Per-Product Accent Colors as CSS Variables, not Utilities

**Choice:** Define accent colors as `--color-accent-*` CSS variables scoped to product containers, not build separate utility classes per product.

**Rationale:**
- Single CSS file serves all products
- Product-specific styling applied via data attributes or class names on root element
- Enables A/B testing or theme switching without rebuilds
- Reduces CSS bundle size (no product duplication)

**Example structure:**
```css
:root {
  --color-accent: #7BD3F7; /* Void default */
}

[data-product="kuma"] {
  --color-accent: #F2E7C9;
}

[data-product="jinn"] {
  --color-accent: #CDA6FF;
}
```

**Alternatives considered:**
- Separate CSS files per product: Duplication, harder to maintain
- Single accent for all: Loses product identity

### Decision 5: Flat Border & Shadow Structure (minimal ornamentation)

**Choice:** 
- Borders: Use `rgba(255,255,255,0.08)` default, `0.04` subtle, `0.16` focus
- Shadows: Low (2px blur), Medium (8px blur), High (20px blur) with consistent 0,Y offset

**Rationale:**
- Minimal but sufficient visual separation
- Opacity-based maintains cohesion with color system
- Shadow blur levels match elevation hierarchy
- No decoration (straight from VOID removal goal)

### Decision 6: Spacing on 8px + 4px grid

**Choice:** 
- Major spacing: 4, 8, 12, 16, 24, 32, 48px (8px grid)
- Minor adjustments: 4px available
- Remove the "ma" (negative space) tokens from VOID

**Rationale:**
- Standard across modern design (Apple, Material, etc.)
- 8px grid for components, 4px for precision alignment
- Simpler than previous system
- Well-documented, easy to teach

### Decision 7: Rounded Corners Return (6px–20px scale)

**Choice:** 
- `radius-sm`: 6px (form inputs, small buttons)
- `radius-md`: 10px (standard cards)
- `radius-lg`: 14px (larger cards, dropdowns)
- `radius-xl`: 20px (hero containers, app icons use percentage scale)

**Rationale:**
- Modern UI standard (no more sharp corners)
- Soft rounded corners reduce visual harshness of dark mode
- Scale provides flexibility for hierarchy
- Icon containers use 22% (matches Apple squircular intent without complex clipping)

### Decision 8: Remove VOID-Specific Constraints (transitions, ASCII texture, philosophy naming)

**Choice:** 
- Remove `transition: none !important` global rule
- Remove ASCII texture utilities (`.ascii-texture`, `.void-metadata`)
- Remove philosophy-named tokens (`ma-*`, `kanso`, `wabi-sabi`)
- Remove monospace-only mandate from headings

**Rationale:**
- These constraints were intentional VOID philosophy, not required for new system
- Modern UIs expect smooth transitions and interactions
- Removes maintenance burden
- Cleans up codebase for better readability

**Alternatives considered:**
- Keep constraints for "consistency": Philosophy doesn't align with new direction

## Risks / Trade-offs

**Risk 1: Large CSS rewrite required across all components**
→ *Mitigation*: Provide compatibility mapping guide (old VOID classes → new utility classes). Phase migration product-by-product if needed.

**Risk 2: Off-white foreground might feel "less contrasted" initially**
→ *Mitigation*: `#E7EAEE` (88% brightness) still meets WCAG AA for dark backgrounds. Test contrast ratios before shipping. Can adjust if user feedback warrants.

**Risk 3: Per-product accent colors via CSS variables requires coordination on root element**
→ *Mitigation*: Document clearly in component setup. Provide examples for each product. Use data attributes for safety.

**Risk 4: Removing transitions might surprise users expecting motion**
→ *Mitigation*: Introduce motion thoughtfully and minimally. Start with hover states, measure interaction feedback.

**Risk 5: Multiple font fallbacks may render differently per platform**
→ *Mitigation*: Test on macOS, Linux, Windows. Fall back to system fonts works well for Inter (widely available). JetBrains Mono has good fallbacks.

## Migration Plan

**Phase 1: Prepare**
1. Create `packages/ui/global.css` with new design system tokens
2. Update `tailwind.config.ts` to reference new tokens
3. Create documentation mapping old → new classes

**Phase 2: Gradual Rollout**
1. Start with one product (recommend: Void, since it's the internal product)
2. Update component styles systematically
3. Test all interactive states (hover, focus, active, disabled)
4. Gather feedback, iterate
5. Roll out to remaining products (Kuma, Jinn, Revrock, Atlas)

**Phase 3: Cleanup**
1. Remove all references to VOID tokens and utilities
2. Remove old CSS file sections
3. Run full test suite across all products
4. Document new system for future developers

**Rollback:** Keep old CSS in git history. If critical issues arise, revert to previous commit and diagnose before reapplying.

## Open Questions

1. **Font loading:** Should we explicitly load Inter and JetBrains Mono via @font-face, or rely on system fallbacks? (Recommendation: System fallbacks to reduce bundle size)
2. **Transitions:** Which components should have smooth transitions? Buttons, modals, dropdowns only? Or all interactive elements? (Recommendation: Interactive elements with ≤300ms cubic-bezier(0.32, 0.72, 0.28, 1))
3. **Motion preferences:** Should we respect `prefers-reduced-motion`? (Recommendation: Yes, essential for accessibility)
4. **Product accent usage:** Are accents used only for highlights/active states, or also for primary CTAs? (Recommendation: Primarily highlights/graphs, secondary for focus states)
5. **Component defaults:** Should component library provide pre-built button/card styles, or just tokens? (Recommendation: Provide utility-based patterns, not locked components)
