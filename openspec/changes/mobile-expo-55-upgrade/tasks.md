## 1. Discovery and Baseline

- [ ] 1.1 Create architecture inventory: route files, provider graph, feature ownership, and shared UI exports
- [ ] 1.2 Capture baseline behavior logs for startup, auth redirect, and core task flows
- [ ] 1.3 Record `bun run check`, `bun run test`, `bun run check` + `npx expo-doctor` baseline output

## 2. Dependency and Runtime Upgrade

- [ ] 2.1 Run `npx expo upgrade` scoped to `apps/mobile` and review generated diffs
- [ ] 2.2 Use `npx expo install` for Expo-managed modules
- [ ] 2.3 Resolve non-managed dependency alignment (reanimated/worklets/vector icons) without manual version guessing
- [ ] 2.4 Commit lockfile and dependency reconciliation changes

## 3. Native Tab Navigation Implementation

- [ ] 3.1 Create `app/(tabs)/` group structure for Chat, Notes, Focus, Account
- [ ] 3.2 Implement tab-level layout with provider hierarchy and root navigation wiring
- [ ] 3.3 Define tab routing: map existing screens to Chat/Notes/Focus/Account tabs
- [ ] 3.4 Implement tab bar primitives: icons (SF Symbols), labels, and badge support
- [ ] 3.5 Add deep-link routing for all tab-accessible screens
- [ ] 3.6 Validate tab persistence: switching tabs preserves local UI state
- [ ] 3.7 Test tab switching performance: ensure smooth 60fps transitions

## 4. Advanced Expo Router Setup

- [ ] 4.1 Implement route protection via guarded groups for auth and onboarding flows
- [ ] 4.2 Setup `+native-intent` file for deep link rewriting and app-level routing
- [ ] 4.3 Configure Server Components (RSC) for API route handlers (optional: AI service integration)
- [ ] 4.4 Implement route groups + array syntax for feature reuse (shared profile screen across tabs)
- [ ] 4.5 Add bottom sheet primitives using native presentation form sheet
- [ ] 4.6 Setup link preview for iOS (long-press behavior with context menu)
- [ ] 4.7 Configure static rendering (SSG) for any marketing/web content routes
- [ ] 4.8 Test native tab bars with unstable_native_tabs (or custom headless layout if needed)

## 5. App-Shell Modernization

- [ ] 5.1 Move/normalize providers in `app/_layout.tsx` into explicit app-shell modules
- [ ] 5.2 Define stable provider order: crash boundary, query/telemetry, auth, performance, theme, and navigation
- [ ] 5.3 Ensure auth/variant gating and tab navigation remain properly sequenced

## 6. State Management & Dependency Setup

- [ ] 6.1 Add `zustand` for feature-local state management
- [ ] 6.2 Add `zod` for runtime validation at API boundaries
- [ ] 6.3 Define state pattern: React Query (server) + Zustand (local) + Context (root only)
- [ ] 6.4 Create example state hooks in feature domains (verify Zustand integration)
- [ ] 6.5 Update API layer to use Zod validation

## 7. Feature-Sliced Refactor Foundation

- [ ] 7.1 Create target folders for `src/features`, `src/shared`, and `src/infra`
- [ ] 7.2 Add migration map that maps every current screen to a feature slice owner
- [ ] 7.3 Move one low-risk feature first (for example onboarding or account) end-to-end into feature-slice structure
- [ ] 7.4 Migrate another high-traffic feature (chat or focus) and keep parity checks green
- [ ] 7.5 Move reusable utilities into shared modules and remove accidental cross-feature coupling

## 8. Apple Design System Buildout

- [ ] 8.1 Create semantic token modules for colors, spacing, typography, radius, and motion (HIG-aligned)
- [ ] 8.2 Add shared primitives for text, cards, sections, toolbar actions, and symbol-backed icons
- [ ] 8.3 Add tab bar label and icon primitives with HIG-compliant sizing (≥44pt hit targets)
- [ ] 8.4 Add safe-area-first layout defaults and reusable list spacing patterns
- [ ] 8.5 Implement SF Symbols wrapper for iOS and Material Icons wrapper for Android
- [ ] 8.6 Add bottom sheet primitive for native form sheet presentation
- [ ] 8.7 Migrate migrated feature screens to primitives; keep untouched screens in compatibility mode

## 9. Navigation, Animation, Deep Linking & Gesture Alignment

- [ ] 9.1 Validate route structure and provider boundaries after tab and app-shell migration
- [ ] 9.2 Validate deep-link routing into each tab via `+native-intent`
- [ ] 9.3 Test guarded group auth flow: redirect unauthorized users to auth route
- [ ] 9.4 Test route group reuse: verify shared screens work across multiple route parents
- [ ] 9.5 Standardize touch targets and interaction affordances for migrated screens (≥44pt iOS, ≥48dp Android)
- [ ] 9.6 Audit and update animation hooks for Expo 55-safe reanimated/worklets behavior
- [ ] 9.7 Validate web and native parity for tab navigation and route transitions
- [ ] 9.8 Test tab badge indicators and notification badges
- [ ] 9.9 Implement reduced-motion support: animations can be disabled per system setting
- [ ] 9.10 Test Server Components (RSC) if used: verify secure data fetching and secrets handling

## 10. Testing, Accessibility & Performance Validation

- [ ] 10.1 Unit tests: add/update tests for Zustand stores and Zod validation (target 80%+ coverage)
- [ ] 10.2 Unit tests for route guards and deep link handling
- [ ] 10.3 E2E smoke: Detox tests for tab switching, auth flow, and key feature flows
- [ ] 10.4 E2E smoke: Detox tests for guarded routes and deep link routing
- [ ] 10.5 E2E smoke: Playwright tests for web platform and static rendering
- [ ] 10.6 **Accessibility audit:**
  - [ ] 10.6a Run axe-core automated accessibility testing on all screens
  - [ ] 10.6b Manual VoiceOver testing (iOS) and TalkBack testing (Android)
  - [ ] 10.6c Test bottom sheet accessibility and dismissal gestures
  - [ ] 10.6d Verify color contrast meets WCAG 2.1 AA (4.5:1 for text, 3:1 for graphics)
  - [ ] 10.6e Verify touch targets meet minimums (44pt iOS, 48dp Android)
- [ ] 10.7 **Performance metrics:**
  - [ ] 10.7a Cold start time (target <2s iOS, <3s Android)
  - [ ] 10.7b Memory baseline and peak usage
  - [ ] 10.7c Frame rate stability: 60fps sustained in key interactions
  - [ ] 10.7d Bundle size delta: target no regression >5%
  - [ ] 10.7e Deep link resolution time
- [ ] 10.8 Visual regression testing setup (Percy or similar)

## 11. Release & Deployment Validation

- [ ] 11.1 Run `npx expo-doctor`, `bun run check`, `bun run test`, and selected detox smoke
- [ ] 11.2 Run `bun run ios` and `bun run android` for dev variant with tab navigation
- [ ] 11.3 Run `bun run web` and confirm static output stability and SSG rendering
- [ ] 11.4 Capture and review native folder diffs for all variants
- [ ] 11.5 Validate all OTA channels and variant identifiers
- [ ] 11.6 Test deep link handling across all variants (native intent rewriting)
- [ ] 11.7 Test end-to-end: dev → preview (OTA) → production
- [ ] 11.8 Validate Server Components if used: test secure data fetching in production
- [ ] 11.9 Publish migration decision: feature-wave readiness or rollback criteria
