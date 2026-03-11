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

## Phase 10: Replace High-Frequency Raw Usage

- [x] 10.1 Replace all raw `<button>` usages in feature code with `Button`; preserve existing variants through props
- [x] 10.2 Replace all raw `<input>` usages in feature code with `TextField`; wire label and error state through `Field`
- [x] 10.3 Replace all raw `<textarea>` usages with `TextArea`; wire through `Field`
- [x] 10.4 Replace all raw `<select>` usages with `SelectField` (create if missing); wire through `Field`
- [x] 10.5 Replace raw `<form>` wrappers with `Form`; preserve submit logic
- [x] 10.6 Replace orphaned `<label>` elements with `Field` label slot
- [x] 10.7 Replace mobile `Pressable`/`TouchableOpacity` with `Button` or `IconButton` wherever behavior matches
- [x] 10.8 Replace mobile `TextInput` in feature code with `TextField`
- [x] 10.9 Replace repeated ad hoc `<div className="flex flex-col gap-*">` patterns with `Stack`
- [x] 10.10 Replace repeated `<div className="flex items-center gap-*">` patterns with `Inline`
- [ ] 10.11 Replace raw heading tags (`<h1>`–`<h4>`) in feature routes with `Heading`
- [ ] 10.12 Replace direct `<p>` / `<span>` / mobile `<Text>` for body text with `Text` primitive
- [ ] 10.13 Replace ad hoc page/screen shell wrappers with `Screen` or `Page` where applicable
- [ ] 10.14 Replace one-off `<div className="rounded-* border bg-* p-*">` card patterns with `Card`

## Phase 11: Standardize Responsive Layout

- [ ] 11.1 Identify all one-off media-query or breakpoint logic in feature code
- [ ] 11.2 Define breakpoint tokens in `packages/ui/src/tokens/breakpoints.ts`; ensure consistent sm/md/lg/xl thresholds across apps
- [ ] 11.3 Extend `Stack` with responsive direction prop (`direction={{ base: "column", md: "row" }}`)
- [ ] 11.4 Create `Container` with canonical max-width and horizontal padding that matches across all apps
- [ ] 11.5 Create `SidebarLayout`, `SplitLayout`, and `CenteredLayout` for the three dominant page patterns
- [ ] 11.6 Migrate auth pages across all apps to `CenteredLayout`
- [ ] 11.7 Migrate settings/account pages to `SidebarLayout` or equivalent
- [ ] 11.8 Migrate list+detail views to `SplitLayout` where applicable
- [ ] 11.9 Remove scattered one-off responsive class combinations that are now covered by layout primitives
- [ ] 11.10 Document responsive layout API and allowed breakpoint usage in design system skill

## Phase 12: Enforce and Prevent Regression

- [ ] 12.1 Add ESLint rule (or use `no-restricted-elements`) to warn on raw `<input>`, `<textarea>`, `<select>`, `<button>`, `<form>` in feature code paths
- [ ] 12.2 Add ESLint rule to warn on direct React Native `TextInput`, `Pressable`, `TouchableOpacity` imports in feature code (outside `packages/ui`)
- [ ] 12.3 Document banned/restricted element list and approved replacements in `.github/skills/design-system/SKILL.md`
- [ ] 12.4 Add Storybook interaction tests for all new primitives to verify state coverage (default, hover, focus, disabled, error, loading)
- [ ] 12.5 Add visual regression snapshots for each Storybook story to catch future drift
- [ ] 12.6 Update PR review checklist in design system skill with primitive adoption rules
- [ ] 12.7 Add a "new screen checklist" to the design system skill: which primitives to reach for first
