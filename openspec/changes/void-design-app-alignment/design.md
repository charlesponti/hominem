## Context

The design system skill at `.github/skills/design-system/SKILL.md` is now the canonical reference for coding the VOID visual language across web and mobile. This skill codifies philosophy, accessibility rules, animation primitives, color/spacing/typography tokens, and troubleshooting. The app layer needs to be systematically audited and corrected to enforce these rules end-to-end.

## Goals / Non-Goals

**Goals:**
- Align all app code (components, routes, styling) to the design system skill rules.
- Replace ad-hoc color, spacing, radius, and animation values with canonical tokens and primitives.
- Fix accessibility issues (focus states, contrast, reduced-motion).
- Document which design decisions are enforced by the system, making it easier for contributors to code correctly the first time.

**Non-Goals:**
- Redesign the visual language itself (the design system is already established).
- Add new visual features or patterns beyond what the design system allows.
- Backfill design tokens for hypothetical future use cases.

## Decisions

### Phased execution by concern, not by app

The implementation is organized by design concern (color/tokens, motion/animation, typography, accessibility, icon usage) rather than by individual app. This approach:
- Ensures uniform rules apply everywhere.
- Catches patterns across multiple apps at once.
- Reduces churn from fixing the same issue in different apps separately.

### Authorization via token imports

Apps gain access to approved colors, spacing, motion durations, and typography through imports from `@hominem/ui/tokens/` and canonical CSS classes / hooks. Code that bypasses these imports signals a gap in the token system and should be escalated.

### Canonical animation applies to both platforms

Web uses CSS animation classes from `animations.css`; mobile uses exported constants and hooks from `motion.ts`. Both platforms respect the same timing, easing, and `prefers-reduced-motion` semantics.

## Risks / Trade-offs

- Some components may have legitimate reasons for non-standard depth or transitions -> Mitigation: document exceptions in component code and spec.
- Performance impact from renaming or refactoring many CSS classes -> Mitigation: use automated linting/formatting where possible.
- Mobile and web may have discovered different animation patterns during development -> Mitigation: unify on the canonical primitives and update any component code that deviates.

## Implementation Strategy

### Phase 1: Color and Typography Tokens
- Audit all app components for hardcoded hex/rgba colors and font sizes.
- Replace with imports from `@hominem/ui/tokens/colors.ts`, `tokens/typography.ts`.
- Verify Tailwind CSS uses only token-based classes (no raw hex in `className`).

### Phase 2: Motion and Animation
- Identify all custom `@keyframes` and ad-hoc transitions in app code.
- Replace with canonical classes (`.void-anim-enter`, `.void-anim-exit`, etc. on web) or hooks (`useVoidEnter`, `useVoidExit` on mobile).
- Remove hover `transform`, `scale`, and similar decorative effects.
- Ensure all motion respects `prefers-reduced-motion`.

### Phase 3: Depth and Visual Hierarchy
- Remove rounded corners used only for decoration (keep only where required by design system).
- Remove shadows unless specifically authorized by the design system.
- Remove blur effects.
- Use negative space and edge alignment instead.

### Phase 4: Focus States and Accessibility
- Audit focus-visible states; fix any with insufficient contrast.
- Ensure text contrast is ≥4.5:1 for readability, ≥3:1 for interactive boundaries.
- Verify semantic HTML usage (buttons are buttons, not divs; links are links, etc.).
- Test with keyboard navigation and screen readers.

### Phase 5: Icon and Typography Alignment
- Remove decorative emojis; replace with semantic icons or plain text.
- Audit heading, label, and body text to meet typography scale (body ≥17px).
- Fix any fixed-height text containers that break relative sizing.

### Phase 6: Verification
- Visual regression testing across supported apps.
- Accessibility audit pass (WCAG 2.2 AA).
- Update related docs and design guidelines.

## Open Questions

- Are there app-specific exceptions to the flat/minimal visual treatment (e.g., illustrations, branded surfaces)? If so, document in the spec before implementation.
- Should design tokens be exported from a centralized Tailwind config, or imported directly from `@hominem/ui/tokens/`?
