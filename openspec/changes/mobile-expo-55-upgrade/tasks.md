## 1. Discovery and Baseline

- [ ] 1.1 Create architecture inventory: route files, provider graph, feature ownership, and shared UI exports
- [ ] 1.2 Capture baseline behavior logs for startup, auth redirect, and core task flows
- [ ] 1.3 Record `bun run check`, `bun run test`, `bun run check` + `npx expo-doctor` baseline output

## 2. Dependency and Runtime Upgrade

- [ ] 2.1 Run `npx expo upgrade` scoped to `apps/mobile` and review generated diffs
- [ ] 2.2 Use `npx expo install` for Expo-managed modules
- [ ] 2.3 Resolve non-managed dependency alignment (reanimated/worklets/vector icons) without manual version guessing
- [ ] 2.4 Commit lockfile and dependency reconciliation changes

## 3. App-Shell Modernization

- [ ] 3.1 Move/normalize providers in `app/_layout.tsx` into explicit app-shell modules
- [ ] 3.2 Define stable provider order: crash boundary, query/telemetry, auth, performance, theme, and navigation
- [ ] 3.3 Ensure auth/variant gating remains unchanged and documented

## 4. Feature-Sliced Refactor Foundation

- [ ] 4.1 Create target folders for `src/features`, `src/shared`, and `src/infra`
- [ ] 4.2 Add migration map that maps every current screen to a feature slice owner
- [ ] 4.3 Move one low-risk feature first (for example onboarding or account) end-to-end into feature-slice structure
- [ ] 4.4 Migrate another high-traffic feature (chat or focus) and keep parity checks green
- [ ] 4.5 Move reusable utilities into shared modules and remove accidental cross-feature coupling

## 5. Apple Design System Buildout

- [ ] 5.1 Create semantic token modules for colors, spacing, typography, radius, and motion
- [ ] 5.2 Add shared primitives for text, cards, sections, toolbar actions, and symbol-backed icons
- [ ] 5.3 Add safe-area-first layout defaults and reusable list spacing patterns
- [ ] 5.4 Migrate migrated feature screens to primitives; keep untouched screens in compatibility mode

## 6. Navigation and Gesture Alignment

- [ ] 6.1 Validate route structure and provider boundaries after app-shell migration
- [ ] 6.2 Standardize touch targets and interaction affordances for migrated screens
- [ ] 6.3 Audit and update animation hooks for Expo 55-safe reanimated/worklets behavior
- [ ] 6.4 Validate web and native parity for shell navigation and route transitions

## 7. Validation, Performance, and Release Readiness

- [ ] 7.1 Run `npx expo-doctor`, `bun run check`, `bun run test`, and selected detox smoke
- [ ] 7.2 Run `bun run ios` and `bun run android` for dev variant and confirm boot success
- [ ] 7.3 Run `bun run web` and confirm route rendering and static output stability
- [ ] 7.4 Compare pre/post startup time and memory baselines for dev launch
- [ ] 7.5 Capture and review native folder diffs for all required variants
- [ ] 7.6 Publish migration decision: continue next feature wave or pause for rollback/repairs
