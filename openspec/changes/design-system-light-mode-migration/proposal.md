## Why

The design system specification (`.github/skills/design-system`) explicitly requires single light-mode-only design per Apple Human Interface Guidelines, but the actual implementation is dark-mode-only. This mismatch violates the void-app-design-alignment specification and prevents the app from achieving the specified light-mode visual identity.

## What Changes

- Update design-system skill to document the canonical light-mode color palette per Apple HIG
- Migrate all color tokens from dark-mode values to light-mode values in `@hominem/ui/tokens/colors.ts`
- Update CSS custom properties in `packages/ui/src/styles/globals.css` to match light palette
- Align mobile and web app themes to use consistent light colors
- Verify all apps (finance, notes, mobile) build and render correctly with new light colors

## Capabilities

### New Capabilities
- `light-mode-design-system`: Apps render with canonical light-mode palette aligned to Apple HIG, WCAG 2.2 AA contrast compliance

### Modified Capabilities
- `design-affordance-rendering`: Color semantics and visual hierarchy updated for light backgrounds

## Impact

- `.github/skills/design-system/SKILL.md` — canonical design spec
- `packages/ui/src/tokens/colors.ts` — token source
- `packages/ui/src/styles/globals.css` — CSS variables and component styles
- `apps/mobile/theme/theme.ts` — Restyle theme (auto-updated via token import)
- `apps/finance` and `apps/notes` — web apps (CSS-driven theme)
- All components rendering colors (visual refresh required, no API changes)

## Visual Changes

- Backgrounds: Off-black (#0f1113) → White (#ffffff)
- Text: Off-white (#e7eaee) → Black (#000000)
- Accent: Cool blue (#7bd3f7) → Apple Blue (#007AFF)
- Borders: White opacities → Black opacities
- Emphasis scale: Inverted (white opacities → black opacities)

## References

- Design spec: [.github/skills/design-system/SKILL.md](.github/skills/design-system/SKILL.md)
- void-app-design-alignment: `openspec/specs/void-app-design-alignment/spec.md`
- Apple HID Colors: https://developer.apple.com/design/human-interface-guidelines/color
