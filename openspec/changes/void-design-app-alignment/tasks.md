## Phase 1: Color and Typography Tokens

- [ ] 1.1 Audit all app routes and components for hardcoded hex/rgba color values
- [ ] 1.2 Replace hardcoded colors with imports from `@hominem/ui/tokens/colors.ts`
- [ ] 1.3 Verify Tailwind CSS color classes use only approved token values (no raw hex in `className`)
- [ ] 1.4 Audit typography (font-size, font-weight, line-height) in app components
- [ ] 1.5 Replace arbitrary font sizes with canonical typography scale from `@hominem/ui/tokens/typography.ts`
- [ ] 1.6 Ensure body/prose text is ≥17px; fix any fixed-height containers that break relative sizing

## Phase 2: Motion and Animation

- [ ] 2.1 Identify all custom `@keyframes` and ad-hoc `transition` or `animation` properties in app CSS/JSX
- [ ] 2.2 Replace with canonical web classes (`.void-anim-enter`, `.void-anim-exit`, directional variants) from `animations.css`
- [ ] 2.3 Replace mobile custom animations with hooks from `apps/mobile/components/animated/fade-in.tsx` (`FadeIn`, `useVoidEnter()`, `useVoidExit()`)
- [ ] 2.4 Remove all hover `transform`, `scale`, and related decorative effects
- [ ] 2.5 Audit all motion for `prefers-reduced-motion` compliance (should disable or respect system preference)
- [ ] 2.6 Remove motion-based UI patterns that require animation for state clarity (use color, position, or text instead)

## Phase 3: Depth and Visual Hierarchy

- [ ] 3.1 Identify all `rounded-*` (border-radius) usage in app code; document which are decorative vs. structural
- [ ] 3.2 Remove decorative rounded corners; keep only where required by the design system
- [ ] 3.3 Identify all `shadow-*` utilities or `box-shadow` properties in app style
- [ ] 3.4 Remove non-canonical shadows (design system allows only specific depth treatments if needed)
- [ ] 3.5 Identify and remove `blur()` filters and effects
- [ ] 3.6 Audit visual hierarchy; use negative space, edge alignment, and typography weight instead of depth effects

## Phase 4: Focus States and Accessibility

- [ ] 4.1 Audit all `:focus-visible` states in app components and shared UI
- [ ] 4.2 Ensure focus indicators have ≥4.5:1 contrast (WCAG 2.2 AA)
- [ ] 4.3 Verify all text has ≥4.5:1 contrast against background (WCAG 2.2 AA)
- [ ] 4.4 Verify interactive element boundaries have ≥3:1 contrast
- [ ] 4.5 Fix any missing focus outlines or broken focus visibility
- [ ] 4.6 Verify semantic HTML usage (buttons, links, landmarks, labels)
- [ ] 4.7 Test keyboard navigation and screen reader compatibility

## Phase 5: Icon and Typography Alignment

- [ ] 5.1 Identify decorative emojis in app code; evaluate whether they add semantic meaning
- [ ] 5.2 Replace non-semantic emojis with semantic icons or remove
- [ ] 5.3 Ensure icon usage aligns with design system rule: "icons only when they communicate information"
- [ ] 5.4 Audit heading styles; ensure they follow approved typography scale
- [ ] 5.5 Audit form label and button text typography; ensure consistency with design system

## Phase 6: Verification and Documentation

- [ ] 6.1 Run visual regression tests across all affected apps
- [ ] 6.2 Conduct full WCAG 2.2 AA accessibility audit
- [ ] 6.3 Test on both web and mobile platforms
- [ ] 6.4 Verify motion on both desktop and mobile respect `prefers-reduced-motion`
- [ ] 6.5 Update or create design system verification doc for future contributors
- [ ] 6.6 Update AGENTS.md or design skill if new rules or patterns are discovered
