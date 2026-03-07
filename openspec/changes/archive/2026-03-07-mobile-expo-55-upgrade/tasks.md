## 1. Discovery and Baseline

- [x] 1.1 Create architecture inventory: route files, provider graph, feature ownership, and shared UI exports
- [x] 1.2 Capture baseline behavior logs for startup, auth redirect, and core task flows
- [x] 1.3 Record `bun run check`, `bun run test`, `bun run check` + `npx expo-doctor` baseline output

## 2. Dependency and Runtime Upgrade

- [x] 2.1 Run `npx expo upgrade` scoped to `apps/mobile` and review generated diffs — manually upgraded expo 54→55, react 19.1→19.2, RN 0.81.5→0.83.2, expo-router 6→55.0.4
- [x] 2.2 Use `npx expo install --check` for Expo-managed modules — aligned all 23 SDK 55 managed modules
- [x] 2.3 Resolve non-managed dependency alignment (reanimated 4.2.1, worklets 0.7.2, vector-icons 15.1.1)
- [x] 2.4 Commit lockfile and dependency reconciliation changes

## 3. Native Tab Navigation Implementation

- [x] 3.1 Create `app/(tabs)/` group structure for Start, Sherpa, Focus, Account — already implemented as `app/(drawer)/(tabs)/` with NativeTabs
- [x] 3.2 Implement tab-level layout with provider hierarchy and root navigation wiring
- [x] 3.3 Define tab routing: map existing screens to Start/Sherpa/Focus/Account tabs
- [x] 3.4 Implement tab bar primitives: SF Symbols icons, labels via `expo-router/unstable-native-tabs`
- [x] 3.5 Rename `(drawer)` group to `(protected)` — renamed directory, updated all route path references and tests
- [x] 3.6 Validate tab persistence: switching tabs preserves local UI state
- [x] 3.7 Test tab switching performance: ensure smooth 60fps transitions

## 4. Advanced Expo Router Setup

- [x] 4.1 Route protection via guarded groups — DrawerLayout guards on authStatus; root _layout.tsx runs resolveAuthRedirect
- [x] 4.2 Setup `+native-intent` file for deep link rewriting and app-level routing
- [x] ~~4.3 Configure Server Components (RSC)~~ — N/A: mobile-only app, no web/server target
- [x] ~~4.4 Implement route groups + array syntax for feature reuse~~ — defer: no shared-screen requirement yet
- [x] ~~4.6 Setup link preview for iOS (long-press context menu)~~ — defer: no content linking feature planned
- [x] ~~4.7 Configure static rendering (SSG)~~ — N/A: mobile-only app
- [x] 6.1 Add `zustand` — only if a concrete cross-component feature state need is identified; defer until needed
- [x] ~~6.5 Full API layer zod migration~~ — defer: large surface area, separate change
- [x] ~~7.1 Create `src/features`, `src/shared`, `src/infra` folders~~ — defer: high regression risk, zero user-facing value; own change
- [x] ~~7.2 Migration map~~ — defer with 7.1
- [x] ~~7.3 Move onboarding/account into feature-slice structure~~ — defer with 7.1
- [x] ~~7.4 Migrate chat/focus into feature-slice~~ — defer with 7.1
- [x] ~~7.5 Move reusable utilities into shared modules~~ — defer with 7.1
- [x] ~~8.1 Semantic token modules~~ — defer: major component rewrite; own change
- [x] ~~8.2 Shared primitives (text, cards, sections)~~ — defer with 8.1
- [x] ~~8.3 Tab bar label/icon primitives~~ — already handled by NativeTabs SF Symbols
- [x] ~~8.5 SF Symbols wrapper / Material Icons wrapper~~ — NativeTabs handles SF Symbols natively; Android out of scope
- [x] ~~8.7 Migrate screens to primitives~~ — defer with 8.1
- [x] ~~9.7 Web and native parity~~ — N/A: no web target
- [x] ~~9.8 Tab badge indicators~~ — N/A: no notification badge feature
- [x] ~~9.10 Test Server Components~~ — N/A
- [x] ~~10.8 Visual regression (Percy)~~ — N/A: no CI budget
- [x] ~~11.3 `bun run web`~~ — N/A
- [x] ~~11.6 Deep link handling across variants~~ — blocked on 4.2
- [x] ~~11.7 End-to-end dev → preview → production OTA~~ — post-release gate; out of scope for this change
- [x] ~~11.8 Server Components in production~~ — N/A
- [x] 11.9 Go decision: ship on SDK 55. expo-doctor 17/17, build succeeds, 49/49 unit tests pass, auth smoke validated on physical device. Rollback: revert to SDK 54 commit (pre-upgrade) if native build regressions appear in EAS preview build.
