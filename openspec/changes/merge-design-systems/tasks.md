## 1. Design System File Creation

- [x] 1.1 Create `packages/ui/global.css` with complete design system tokens in Tailwind v4 format
- [x] 1.2 Define all color tokens (backgrounds, text, borders, icons, accents) in `@theme` block
- [x] 1.3 Define all typography tokens (font families, sizes, weights, line heights, letter spacing)
- [x] 1.4 Define all spacing tokens on 8px + 4px grid
- [x] 1.5 Define all radius tokens (6px, 10px, 14px, 20px scales)
- [x] 1.6 Define all shadow tokens (low, medium, high with proper opacity)
- [x] 1.7 Add per-product accent color overrides via `[data-product="*"]` selectors
- [x] 1.8 Enable smooth transitions globally (remove `transition: none !important`)
- [x] 1.9 Remove all VOID-specific CSS (kanso, ma, wabi-sabi, ASCII texture, sharp corners)
- [x] 1.10 Ensure no conflicts with existing Tailwind config

## 2. Tailwind Configuration Updates

- [x] 2.1 Update `tailwind.config.ts` in `packages/ui` to extend theme with new tokens
- [x] 2.2 Configure Tailwind to use CSS custom properties for all color utilities
- [x] 2.3 Ensure font stack includes Inter and JetBrains Mono with proper fallbacks
- [x] 2.4 Add custom spacing scale (4px, 8px, 12px, 16px, 24px, 32px, 48px)
- [x] 2.5 Add custom radius scale
- [x] 2.6 Add custom shadow definitions
- [x] 2.7 Add custom typography utilities (display-1 through display-2, heading-1 through heading-4, body-1 through body-4, subheading-1 through subheading-4)
- [x] 2.8 Update Tailwind config in all other packages (`apps/kuma`, `apps/jinn`, `apps/void`, `apps/revrock`, `apps/atlas`) - implemented via global.css
- [x] 2.9 Verify no naming conflicts with existing utilities
- [x] 2.10 Test Tailwind JIT compilation

## 3. Component Utility Classes

- [x] 3.1 Create button utility classes (`.btn-primary`, `.btn-secondary`, `.btn-destructive` with proper hover/focus states)
- [x] 3.2 Create card/surface utilities (`.card`, `.card-elevated` with borders and shadows)
- [x] 3.3 Create input field utilities (`.input`, `.input-base` with focus rings and error states)
- [x] 3.4 Create text emphasis utilities aligned to semantic tokens
- [x] 3.5 Create badge/label utilities for small indicators
- [x] 3.6 Create transition utilities (`.transition-colors`, `.transition-opacity` with proper timing)
- [x] 3.7 Create hover/focus/active state utilities that respect `prefers-reduced-motion`
- [x] 3.8 Create modal/overlay utilities for dialogs
- [x] 3.9 Create link/anchor utilities with hover states
- [x] 3.10 Create gap/padding/margin utilities on 8px grid
- [ ] 3.11 Document all component patterns in design system documentation
- [x] 3.12 Add CSS comments explaining opacity-based elevation system

## 4. Migration & Documentation

- [ ] 4.1 Create mapping guide: old VOID tokens → new semantic tokens
- [ ] 4.2 Document new token naming conventions (color-, spacing-, etc.)
- [ ] 4.3 Document per-product accent theming (data-product attribute)
- [ ] 4.4 Create examples for each component utility class
- [ ] 4.5 Add accessibility notes (contrast ratios, focus states, reduced motion)
- [ ] 4.6 Document typography scale usage and clamp() formulas
- [ ] 4.7 Document shadow/elevation patterns
- [ ] 4.8 Create developer guide for building new components with new system
- [x] 4.9 Add comments in global.css explaining design decisions
- [ ] 4.10 Create troubleshooting guide for common styling issues

## 5. Product-Specific Styling

- [x] 5.1 Add `[data-product="void"]` accent override (#7BD3F7) to global.css
- [x] 5.2 Add `[data-product="kuma"]` accent override (#F2E7C9) to global.css
- [x] 5.3 Add `[data-product="jinn"]` accent override (#CDA6FF) to global.css
- [x] 5.4 Add `[data-product="revrock"]` accent override (#FFB86B) to global.css
- [x] 5.5 Add `[data-product="atlas"]` accent override (#8ED1C2) to global.css
- [ ] 5.6 Ensure each product app initializes with correct `data-product` attribute
- [ ] 5.7 Test accent colors apply correctly across interactive components
- [ ] 5.8 Verify accent colors don't override critical colors (text, borders)
- [ ] 5.9 Create product-specific documentation for customization
- [ ] 5.10 Set up root element theming mechanism (document in README)

## 6. Font Setup

- [ ] 6.1 Verify Inter font is available (system fallback or via @font-face)
- [ ] 6.2 Verify JetBrains Mono font is available (system fallback or via @font-face)
- [ ] 6.3 Test font stack on macOS (should render SF Pro)
- [ ] 6.4 Test font stack on Windows (should fallback to Segoe UI)
- [ ] 6.5 Test font stack on Linux (should render monospace fallback)
- [ ] 6.6 Verify code blocks render in JetBrains Mono
- [ ] 6.7 Verify technical metadata uses monospace
- [ ] 6.8 Check letter spacing in dark mode (reduced ink bleed for small text)
- [ ] 6.9 Verify line heights match Apple HIG standards
- [ ] 6.10 Test responsive typography scaling with clamp()

## 7. Testing & Validation

- [ ] 7.1 Run Tailwind compilation without errors
- [ ] 7.2 Check CSS file size and optimize if needed
- [ ] 7.3 Test all color tokens on dark backgrounds (ensure readability)
- [ ] 7.4 Test all button states (hover, active, focus, disabled)
- [ ] 7.5 Test all form input states (focus, error, disabled)
- [ ] 7.6 Test opacity-based elevation (cards, modals, surfaces appear properly layered)
- [ ] 7.7 Test border visibility on dark backgrounds
- [ ] 7.8 Test icon colors (primary and muted)
- [ ] 7.9 Test accent colors in each product context
- [ ] 7.10 Test transitions respect `prefers-reduced-motion` preference
- [ ] 7.11 Test focus rings are visible for keyboard navigation
- [ ] 7.12 Verify no VOID tokens remain in compiled CSS

## 8. Component Updates

- [ ] 8.1 Audit all existing components in `packages/ui` for VOID-specific styling
- [ ] 8.2 Update button components to use new `.btn-*` utilities
- [ ] 8.3 Update card components to use new `.card` utilities
- [ ] 8.4 Update input components to use new `.input` utilities
- [ ] 8.5 Update modal/dialog components with new utilities
- [ ] 8.6 Update navigation components to use new spacing/typography
- [ ] 8.7 Update form components with new styles
- [ ] 8.8 Update data display components (tables, lists) with new tokens
- [ ] 8.9 Remove all custom CSS that conflicts with new system
- [ ] 8.10 Test each component in both dark mode and across products
- [ ] 8.11 Ensure component Props/TypeScript don't need changes (CSS-only)
- [ ] 8.12 Verify no hardcoded colors in component JSX/TSX

## 9. App-Level Updates

- [ ] 9.1 Update root element in `apps/void` to include `data-product="void"`
- [ ] 9.2 Update root element in `apps/kuma` to include `data-product="kuma"`
- [ ] 9.3 Update root element in `apps/jinn` to include `data-product="jinn"`
- [ ] 9.4 Update root element in `apps/revrock` to include `data-product="revrock"`
- [ ] 9.5 Update root element in `apps/atlas` to include `data-product="atlas"`
- [ ] 9.6 Verify all apps import `@hominem/ui` global.css
- [ ] 9.7 Remove any app-level VOID-specific styling
- [ ] 9.8 Test each app loads without style errors
- [ ] 9.9 Verify accent colors apply correctly to each app
- [ ] 9.10 Check responsive layouts still work with new spacing

## 10. Final Integration & Cleanup

- [ ] 10.1 Run `bun run typecheck` (ensure no TypeScript errors)
- [ ] 10.2 Run `bun run lint --parallel` (check CSS/code style)
- [ ] 10.3 Run `bun run test` (verify no unit test breaks)
- [ ] 10.4 Run `bun run check` (full safety suite)
- [ ] 10.5 Visual regression testing: take screenshots of each product before/after
- [ ] 10.6 Cross-browser testing (Chrome, Firefox, Safari)
- [ ] 10.7 Mobile testing (responsive design works)
- [ ] 10.8 Accessibility testing (screen reader compatibility, focus management)
- [ ] 10.9 Performance check (no CSS file bloat, Tailwind purges unused utilities)
- [ ] 10.10 Remove any temporary VOID classes from codebase
- [ ] 10.11 Ensure git history clean (no accidental VOID references)
- [ ] 10.12 Create pull request with all changes and comprehensive documentation
