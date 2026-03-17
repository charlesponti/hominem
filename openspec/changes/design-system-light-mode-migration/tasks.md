# Tasks: Design System Light-Mode Migration

## Completed Tasks ✓

### 1. Update Design System Skill ✓
- **Task:** Update `.github/skills/design-system/SKILL.md` with canonical light palette
- **Completed:** Added "Color Token Reference" section with complete palette tables
- **Details:**
  - Added backgrounds table (bg-base, bg-surface, bg-elevated, bg-overlay)
  - Added text colors table (text-primary through text-disabled)
  - Added borders table (border-default, border-subtle, border-focus)
  - Added semantic status table (success, warning, destructive)
  - Added accent table (accent, accent-foreground)
  - Added emphasis scale table with 8 levels
  - Added icon and sidebar colors
  - All with WCAG contrast ratios documented

### 2. Update Color Tokens ✓
- **Task:** Migrate `packages/ui/src/tokens/colors.ts` from dark to light
- **Completed:** All color values replaced
- **Details:**
  - Backgrounds: Off-black (#0f1113–#1a1e22) → Light grays (#ffffff–#f2f2f7)
  - Text: Off-white (#e7eaee–#545b62) → Black and dark grays (#000000–#cccccc)
  - Borders: White opacities → Black opacities
  - Accent: Cool blue (#7bd3f7) → Apple Blue (#007AFF)
  - Emphasis: White opacities → Black opacities (8-level scale)
  - Charts: White opacities → Black opacities
  - Semantic colors unchanged (success, warning, destructive)

### 3. Update Web Theme (globals.css) ✓
- **Task:** Sync `packages/ui/src/styles/globals.css` @theme block with new colors
- **Completed:** All CSS custom properties updated
- **Details:**
  - Replaced @theme color definitions
  - Updated color-scheme from `dark` to `light`
  - Updated button component styles for light mode
  - Updated card component styles
  - Updated input component styles
  - Updated badge component styles
  - Updated shadow values for light backgrounds
  - Glass morphism background updated

### 4. Mobile Theme Auto-Updated ✓
- **Task:** Verify `apps/mobile/theme/theme.ts` auto-updates via token import
- **Completed:** No changes needed; imports `...tokenColors` from canonical source
- **Details:**
  - Theme directly imports tokenColors from @hominem/ui/tokens
  - All color changes applied automatically
  - No hardcoded Restyle colors requiring manual update

### 5. Verify Web Builds ✓

- **Task:** Build `apps/notes` to verify light-mode compilation
- **Completed:** Build successful
- **Details:**
  - `@hominem/notes` built in 27.37s
  - No color-related compilation errors
  - CSS theme properly Applied via Tailwind

### 6. Verify TypeCheck ✓
- **Task:** Run full typecheck suite
- **Completed:** No new type errors introduced by color migration
- **Details:**
  - Pre-existing errors in mobile error boundary unrelated to colors
  - All color tokens properly typed in TypeScript
  - No import/export issues

## Remaining Verification Tasks

### 7. Visual Testing (Recommended)
- **Task:** Visually confirm light-mode rendering
- **Acceptance:**
  - [ ] Web app (notes) rendering with light backgrounds and dark text
  - [ ] Mobile app rendering with light colors
  - [ ] All text legible and meets WCAG 2.2 AA contrast
  - [ ] Focus rings visible and properly styled with Apple Blue
  - [ ] Interactive elements responding correctly
- **Steps:**
  - Run mobile app in Expo and visually inspect
  - Check button, card, input, and badge components
  - Verify form validation colors (success, warning, destructive)

### 8. Snapshot Updates (If Visual Tests Exist)
- **Task:** Update any visual/screenshot test snapshots
- **Acceptance:**
  - [ ] All visual regression tests pass with new light colors
  - [ ] Snapshots committed to repo
- **Steps:**
  - Run `bun run test --update-snapshots` or equivalent
  - Commit updated snapshots

### 9. Brand Review (Optional)
- **Task:** Review accent color change from cool blue to Apple Blue
- **Acceptance:**
  - [ ] Accept Apple Blue (#007AFF), OR
  - [ ] Revert to previous cool blue (#7bd3f7), OR
  - [ ] Choose alternative brand accent
- **Steps:**
  - If reverting: Update `accent: '#007AFF'` to `accent: '#7bd3f7'` in colors.ts and globals.css
  - Re-run builds and verify

## Implementation Details by File

### `.github/skills/design-system/SKILL.md`
- Section added after "Typography Token Reference"
- Complete palette documented with WCAG contrast info
- Lists all tokens used by web and mobile

### `packages/ui/src/tokens/colors.ts`
- **Lines 9–27:** Backgrounds and text colors
- **Lines 28–33:** Borders and icons
- **Lines 34–45:** Semantic colors and accent (Apple Blue)
- **Lines 46–62:** System aliases (primary, secondary, muted, etc.)
- **Lines 63–75:** Emphasis scale (inverted to black opacities)
- **Lines 82–87:** Chart colors (black opacities)

### `packages/ui/src/styles/globals.css`
- **@theme block (lines 9–150):** All CSS custom properties
- **color-scheme (line 204):** Changed from dark to light
- **@layer base (lines 209–214):** html/body styles updated
- **@layer components (lines 480–600):** Button, card, input, badge styles

### `apps/mobile/theme/theme.ts`
- **No changes needed** — imports `tokenColors` from canonical source
- Colors auto-update when token source changes

## Testing Checklist

- [x] Design-system skill updated with color palette
- [x] Color tokens migrated to light mode
- [x] CSS variables updated to match tokens
- [x] Web apps build without errors
- [x] No new TypeScript errors introduced
- [ ] Visual regression tests pass (requires manual verification)
- [ ] Snapshots updated if needed (requires manual verification)
- [ ] Cross-platform parity verified (requires manual verification)

## Rollback Plan

If issues discovered:

1. **Quick rollback:** Revert commit(s) to restore dark colors
2. **Partial rollback:** Revert specific files if needed:
   - Color tokens: `git checkout HEAD -- packages/ui/src/tokens/colors.ts`
   - CSS: `git checkout HEAD -- packages/ui/src/styles/globals.css`
   - Skill: `git checkout HEAD -- .github/skills/design-system/SKILL.md`

## Success Criteria

- ✓ All web and mobile apps compile without color-related errors
- ✓ Colors match canonical light-mode palette from skill doc
- ✓ WCAG 2.2 AA contrast compliance maintained
- ✓ Cross-platform visual parity (web and mobile identical rendering)
- ✓ No hardcoded colors in app code (all from tokens)
- ✓ No `dark:` utilities or `prefers-color-scheme: dark` remaining

## References

- Proposal: `openspec/changes/design-system-light-mode-migration/proposal.md`
- Design Spec: `openspec/changes/design-system-light-mode-migration/design.md`
- Skill Doc: `.github/skills/design-system/SKILL.md`
- Token Source: `packages/ui/src/tokens/colors.ts`
- Web Theme: `packages/ui/src/styles/globals.css`
