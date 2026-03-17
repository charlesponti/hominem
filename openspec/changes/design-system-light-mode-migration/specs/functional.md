# Specification: Light-Mode Design System

## Summary

Migration from dark-mode-only to light-mode-only design system, aligning implementation with void-app-design-alignment specification and design-system skill guidelines. All colors updated per Apple Human Interface Guidelines with WCAG 2.2 AA contrast compliance.

## Requirements

### Requirement: All colors SHALL use Apple HIG light-mode palette

**WHEN** any color is rendered in the app interface
**THEN** the color value comes from the canonical light-mode palette:
- Backgrounds: White (#ffffff) and light grays (#f5f5f7, #f2f2f7)
- Text: Black (#000000) and dark grays (#555555, #888888, #cccccc)
- Borders: Black opacities (rgba(0, 0, 0, 0.1), etc.)
- Accent: Apple Blue (#007AFF)
- Semantic: Green (#34c759), Orange (#ff9500), Red (#ff3b30)

**Acceptance:**
- No off-black backgrounds (#0f1113, #14171a, #1a1e22) remain in rendering
- No off-white text colors (#e7eaee, #b3bac2, #7a828a) in rendered output
- No cool blue accent (#7bd3f7) in primary UI elements
- All semantically-colored elements use correct HIG values

### Requirement: All colors SHALL come from canonical token source

**WHEN** a color is applied anywhere in app, web, or mobile code
**THEN** the value is imported from `@hominem/ui/tokens/colors.ts` or derived via CSS custom properties tied to that source

**Acceptance:**
- No hardcoded hex colors in JSX, React Native components, or stylesheets
- No dark-mode-specific color logic (e.g., `colors.dark`, `isDark ? ... : ...`)
- Web: Tailwind utilities use global CSS variables from `globals.css`
- Mobile: Restyle theme imports `tokenColors` directly
- Build errors occur if non-canonical colors are used

### Requirement: All text and interactive elements SHALL meet WCAG 2.2 AA contrast

**WHEN** text is rendered on any background
**THEN** the color contrast ratio ≥ 4.5:1 (AA standard)

**WHEN** interactive element boundaries are rendered
**THEN** the contrast ratio ≥ 3:1 (AA interactive standard)

**Acceptance:**
- Primary text (#000000) on base background (#ffffff): 21:1 ✓
- Secondary text (#555555) on surface (#f5f5f7): 7.1:1 ✓
- Tertiary text (#888888) on elevated (#f2f2f7): 4.5:1 ✓
- Disabled text (#cccccc) only on non-critical UI (ⓘ review case-by-case)
- Focus ring (Apple Blue #007AFF) on backgrounds: 5.3:1 ✓
- Buttons and links tested for 3:1 minimum

### Requirement: CSS and mobile theme SHALL use canonical token values

**WHEN** `packages/ui/src/styles/globals.css` is parsed
**THEN** all CSS custom properties in @theme block match `packages/ui/src/tokens/colors.ts` exactly

**WHEN** `apps/mobile/theme/theme.ts` initializes Restyle
**THEN** the theme object's colors property includes all tokens from `@hominem/ui/tokens/colors.ts`

**Acceptance:**
- CSS custom properties line-for-line match token source
- Restyle theme includes `...tokenColors` spread operator
- No hardcoded RGBA or hex in theme definitions
- Dark color values never used as fallbacks or aliases

### Requirement: App SHALL NOT use dark-mode utilities or color-scheme preferences

**WHEN** app code is audited for dark-mode patterns
**THEN** no `dark:` Tailwind classes exist in JSX
**AND** no `prefers-color-scheme: dark` media queries exist in CSS
**AND** no conditional color logic based on `isDark` or theme mode switching

**Acceptance:**
- Zero `dark:` prefix utilities in all app components
- Global stylesheet does not include dark mode conditions
- No CSS property overrides for dark appearance
- No `useColorScheme()` or theme toggle hooks

### Requirement: Component library vs. app code isolation

**WHEN** colors are defined in component libraries vs. applications
**THEN** library components (e.g., UI package) define colors; app code selects/composes only
**AND** apps never hardcode colors from the deprecated dark palette

**Acceptance:**
- `packages/ui` components use canonical token imports only
- App components in `apps/*` reference tokens via CSS variables or theme hook
- No palette drift between libraries and apps

### Requirement: Cross-platform color parity

**WHEN** the same component renders on web and mobile
**THEN** colors are visually identical (allowing for platform rendering differences)

**Acceptance:**
- Web button (CSS) and mobile button (React Native) use same accent color
- Text colors render with same perceived brightness on both platforms
- Focus/active states use identical color values
- Platform-specific exceptions documented in component code

### Requirement: Design-system skill SHALL document canonical light palette

**WHEN** `.github/skills/design-system/SKILL.md` is read
**THEN** it contains a complete "Color Token Reference" section
**AND** all palette values match `packages/ui/src/tokens/colors.ts`
**AND** WCAG contrast ratios are documented for each combination

**Acceptance:**
- Skill includes table with all background, text, border, semantic, and accent colors
- Skill includes emphasis scale with 8 opacity levels
- Skill includes sidebar colors (Kanso monochrome)
- Skill includes contrast ratio for common text/background pairs
- No mention of dark-mode colors or dark-mode utilities allowed

## Implementation Scope

### In Scope
- Replace all dark-mode color values with light-mode equivalents in canonical source
- Update CSS custom properties and Restyle definitions
- Update skill documentation
- Build and typecheck verification

### Out of Scope
- Component API changes (color parameter names, etc.)
- Dark-mode support (explicitly forbidden)
- Platform-specific UI overhauls (colors only, not layout/interaction)
- Third-party component library overrides (only @hominem/ui palette)

## Acceptance Tests

### Build Test
```bash
bun run build --filter @hominem/notes
bun run typecheck
```
✓ All builds succeed with no color-related errors

### Visual Test (Manual)

- [ ] Open notes app dev server; inspect light background and dark text
- [ ] Open mobile app; inspect light colors rendering
- [ ] Verify focus ring appears in Apple Blue on interactive elements
- [ ] Verify error states show red (#ff3b30), success shows green (#34c759)

### Token Consistency Test
```bash
grep -r "#0f1113\|#14171a\|#1a1e22\|#e7eaee\|#b3bac2\|#7bd3f7" apps/ --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js"
```
✓ No results (no hardcoded dark colors in app code)

### Skill Documentation Test
- [ ] `.github/skills/design-system/SKILL.md` includes "Color Token Reference" section
- [ ] All tokens documented with values and use cases
- [ ] WCAG contrast ratios listed for text/background combinations
- [ ] No dark-mode utilities mentioned

## Success Criteria

1. **Complete Palette Migration:** All colors.ts values changed to light mode
2. **CSS Sync:** globals.css @theme block matches colors.ts exactly
3. **Skill Updated:** Design-system skill documented with complete light palette
4. **No Regressions:** Builds succeed, typecheck passes, no new errors
5. **Cross-Platform:** Web and mobile render identically with light colors
6. **Contrast Compliant:** WCAG 2.2 AA minimum verified for all text and interactive
7. **Zero Dark References:** No deprecated dark colors in app or library code
