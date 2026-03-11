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

### 1-1 Design Alignment Across Mobile, Desktop, and Notes

All three user-facing apps (mobile Expo app, desktop React Router web app, notes React Router web app) shall render and interact identically when displaying the same content and affordances. This means:

- **Visual hierarchy**: identical spacing, typography size/weight, color application, and border/shadow treatment.
- **Focus and hover states**: identical keyboard navigation experience, focus ring appearance, and interactive element feedback.
- **Motion**: motion timing and easing match exactly between platforms (canonical primitives enforce this).
- **Icon and text treatment**: identical semantic use of icons, emoji removal standards, and fallback rendering.
- **Form and input behavior**: identical input styling, validation feedback, and error messaging presentation.

Platform-specific exceptions (e.g., mobile-only gestures, mobile safe area handling) are allowed only when documented in component code and spec. Visual and interaction design shall not diverge.

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

### Phase 6: 1-1 Design Alignment Verification
- Compare visual rendering of the same component across mobile, desktop, and notes.
- Document pixel-perfect alignment for spacing, typography, color, borders, shadows.
- Identify any platform-specific deviations and either unify them or document exceptions in component code/spec.
- Create side-by-side screenshots or design demos of key user flows (auth, chat, note creation, etc.) and verify visual parity.
- Ensure focus states, hover interactions, and motion timing match identically across all three platforms.

### Phase 7: Verification and Documentation
- Visual regression testing across all affected apps.
- Conduct full WCAG 2.2 AA accessibility audit.
- Test on both web and mobile platforms.
- Verify motion on both desktop and mobile respect `prefers-reduced-motion`.
- Update or create design system verification doc for future contributors.
- Update AGENTS.md or design skill if new rules or patterns are discovered.

## Open Questions

- Are there app-specific exceptions to the flat/minimal visual treatment (e.g., illustrations, branded surfaces)? If so, document in the spec before implementation.
- Should design tokens be exported from a centralized Tailwind config, or imported directly from `@hominem/ui/tokens/`?
