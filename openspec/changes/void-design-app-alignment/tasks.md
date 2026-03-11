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

- [x] 3.1 Identify all `rounded-*` (border-radius) usage in app code; document which are decorative vs. structural
- [x] 3.2 Remove decorative rounded corners; keep only where required by the design system
- [x] 3.3 Identify all `shadow-*` utilities or `box-shadow` properties in app style
- [x] 3.4 Remove non-canonical shadows (design system allows only specific depth treatments if needed)
- [x] 3.5 Identify and remove `blur()` filters and effects
- [x] 3.6 Audit visual hierarchy; use negative space, edge alignment, and typography weight instead of depth effects

## Phase 4: Focus States and Accessibility

- [x] 4.1 Audit all `:focus-visible` states in app components and shared UI
- [x] 4.2 Ensure focus indicators have ≥4.5:1 contrast (WCAG 2.2 AA)
- [x] 4.3 Verify all text has ≥4.5:1 contrast against background (WCAG 2.2 AA)
- [x] 4.4 Verify interactive element boundaries have ≥3:1 contrast
- [x] 4.5 Fix any missing focus outlines or broken focus visibility
- [x] 4.6 Verify semantic HTML usage (buttons, links, landmarks, labels)
- [x] 4.7 Test keyboard navigation and screen reader compatibility

## Phase 5: Icon and Typography Alignment

- [x] 5.1 Identify decorative emojis in app code; evaluate whether they add semantic meaning
- [x] 5.2 Replace non-semantic emojis with semantic icons or remove
- [x] 5.3 Ensure icon usage aligns with design system rule: "icons only when they communicate information"
- [x] 5.4 Audit heading styles; ensure they follow approved typography scale
- [x] 5.5 Audit form label and button text typography; ensure consistency with design system

## Phase 6: 1-1 Design Alignment Across Mobile, Desktop, and Notes

- [x] 6.1 Document shared component usage across `apps/mobile/`, `apps/notes/`, and `apps/rocco/` (chat, auth, input, button, etc.)
- [x] 6.2 Compare visual rendering of key components (button, input, form, card, modal) across all three platforms
- [x] 6.3 Create side-by-side screenshots of identical affordances on mobile vs. desktop vs. notes
- [x] 6.4 Verify spacing (padding, margin, gaps) is identical across platforms using canonical token values
- [x] 6.5 Verify typography rendering matches exactly (font-size, weight, line-height) across all three apps
- [x] 6.6 Verify color application is identical on all platforms (no color value differences)
- [x] 6.7 Verify focus states, keyboard navigation, and interactive feedback are identical across platforms
- [x] 6.8 Verify motion timing and easing match identically on mobile and web (canonical primitives)
- [x] 6.9 Document any platform-specific exceptions (mobile gestures, safe area handling, etc.) in component code and spec
- [x] 6.10 Create a parity matrix or dashboard showing which components/flows have been verified as 1-1 aligned

## Phase 7: Verification and Documentation

- [x] 7.1 Run visual regression tests across all affected apps (mobile, desktop, notes)
- [x] 7.2 Conduct full WCAG 2.2 AA accessibility audit across all platforms
- [x] 7.3 Cross-platform testing: verify the same user flow (auth, note creation, chat) renders identically on mobile and web
- [x] 7.4 Verify motion on both desktop and mobile respect `prefers-reduced-motion`
- [x] 7.5 Update or create design system verification doc for future contributors
- [x] 7.6 Update AGENTS.md or design skill if new rules or patterns are discovered
- [x] 7.7 Create or update design-system alignment checklist for code reviews

## Phase 8: Raw Primitive Audit

- [x] 8.1 Audit all web/Electron feature code for raw `<input>`, `<textarea>`, `<select>`, `<button>`, `<form>`, and `<label>` usage; produce a file-by-file inventory
- [x] 8.2 Audit React Native feature code for raw `TextInput`, `Pressable`, `TouchableOpacity`, `TouchableHighlight`, direct `Text`, and ad hoc `View`/`ScrollView` nesting; produce a file-by-file inventory
- [x] 8.3 Identify repeated `className`/style combinations that appear in 3+ places and are candidates for extraction
- [x] 8.4 Catalog repeated layout patterns (page shell, list+detail, settings, auth, modal/sheet) across apps
- [x] 8.5 Map all raw usages to their intended abstraction (Button, TextField, Field, Stack, etc.)
- [x] 8.6 Produce a priority-ranked replacement list: highest frequency / highest inconsistency first
- [x] 8.7 Document which raw usages are legitimate exceptions (infra, edge cases, performance) and why

## Phase 9: Define Core Primitives

- [x] 9.1 Audit `packages/ui` for existing shared components; document what already covers each primitive category
- [x] 9.2 Create `Button` (web + mobile) with standard variants: default, primary, destructive, ghost, link; sizes: sm, md, lg
- [x] 9.3 Create `TextField` (web + mobile) — wraps `<input type="text|email|password|search">` / `TextInput` with consistent styling, label wiring, error state, disabled state
- [x] 9.4 Create `TextArea` (web + mobile) — wraps `<textarea>` / multiline `TextInput`
- [x] 9.5 Create `Field` — label + control + helper text + error text slot; wires `htmlFor`/`accessibilityLabelledBy` automatically
- [x] 9.6 Create `Form` (web) — semantic `<form>` wrapper with consistent gap and submit handling
- [x] 9.7 Create `Stack` layout primitive (web + mobile) — vertical flex container with gap token, optional dividers
- [x] 9.8 Create `Inline` layout primitive (web + mobile) — horizontal flex container with gap token and wrapping option
- [x] 9.9 Create `Screen` / `Page` shell (web + mobile) — handles safe area, max-width, horizontal padding, scroll behavior
- [x] 9.10 Create `Card` component (web + mobile) — surface container with canonical radius, border, and padding
- [x] 9.11 Create `Text` typography primitive (web + mobile) — maps to design system body/caption/label scale; replaces direct `<p>` / `<span>` / `<Text>` usage
- [x] 9.12 Create `Heading` typography primitive (web + mobile) — maps to h1–h4 / display scale; replaces raw heading tags
- [x] 9.13 Write stories for every new primitive in Storybook (`packages/ui`)

## Phase 10: Storybook

- [x] 10.1 Add Storybook interaction tests for all new primitives to verify state coverage (default, hover, focus, disabled, error, loading)
- [x] 10.2 Add visual regression snapshots for each Storybook story to catch future drift
