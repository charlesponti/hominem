## Phase 1: Color and Typography Tokens

- [x] 1.1 Audit all app routes and components for hardcoded hex/rgba color values
- [x] 1.2 Replace hardcoded colors with imports from `@hominem/ui/tokens/colors.ts`
- [x] 1.3 Verify Tailwind CSS color classes use only approved token values (no raw hex in `className`)
- [x] 1.4 Audit typography (font-size, font-weight, line-height) in app components
- [x] 1.5 Replace arbitrary font sizes with canonical typography scale from `@hominem/ui/tokens/typography.ts`
- [x] 1.6 Ensure body/prose text is ≥17px; fix any fixed-height containers that break relative sizing

## Phase 2: Motion and Animation

- [x] 2.1 Identify all custom `@keyframes` and ad-hoc `transition` or `animation` properties in app CSS/JSX
- [x] 2.2 Replace with canonical web classes (`.void-anim-enter`, `.void-anim-exit`, directional variants) from `animations.css`
- [x] 2.3 Replace mobile custom animations with hooks from `apps/mobile/components/animated/fade-in.tsx` (`FadeIn`, `useVoidEnter()`, `useVoidExit()`)
- [x] 2.4 Remove all hover `transform`, `scale`, and related decorative effects
- [x] 2.5 Audit all motion for `prefers-reduced-motion` compliance (should disable or respect system preference)
- [x] 2.6 Remove motion-based UI patterns that require animation for state clarity (use color, position, or text instead)

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

## Phase 6: 1-1 Design Alignment Across Mobile, Desktop, and Notes

- [ ] 6.1 Document shared component usage across `apps/mobile/`, `apps/notes/`, and `apps/rocco/` (chat, auth, input, button, etc.)
- [ ] 6.2 Compare visual rendering of key components (button, input, form, card, modal) across all three platforms
- [ ] 6.3 Create side-by-side screenshots of identical affordances on mobile vs. desktop vs. notes
- [ ] 6.4 Verify spacing (padding, margin, gaps) is identical across platforms using canonical token values
- [ ] 6.5 Verify typography rendering matches exactly (font-size, weight, line-height) across all three apps
- [ ] 6.6 Verify color application is identical on all platforms (no color value differences)
- [ ] 6.7 Verify focus states, keyboard navigation, and interactive feedback are identical across platforms
- [ ] 6.8 Verify motion timing and easing match identically on mobile and web (canonical primitives)
- [ ] 6.9 Document any platform-specific exceptions (mobile gestures, safe area handling, etc.) in component code and spec
- [ ] 6.10 Create a parity matrix or dashboard showing which components/flows have been verified as 1-1 aligned

## Phase 7: Verification and Documentation

- [ ] 7.1 Run visual regression tests across all affected apps (mobile, desktop, notes)
- [ ] 7.2 Conduct full WCAG 2.2 AA accessibility audit across all platforms
- [ ] 7.3 Cross-platform testing: verify the same user flow (auth, note creation, chat) renders identically on mobile and web
- [ ] 7.4 Verify motion on both desktop and mobile respect `prefers-reduced-motion`
- [ ] 7.5 Update or create design system verification doc for future contributors
- [ ] 7.6 Update AGENTS.md or design skill if new rules or patterns are discovered
- [ ] 7.7 Create or update design-system alignment checklist for code reviews
