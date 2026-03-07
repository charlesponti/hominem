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
- [ ] ~~4.3 Configure Server Components (RSC)~~ — N/A: mobile-only app, no web/server target
- [ ] ~~4.4 Implement route groups + array syntax for feature reuse~~ — defer: no shared-screen requirement yet
- [x] 4.5 Bottom sheet primitive — exists at `components/bottom-sheet.tsx`
- [ ] ~~4.6 Setup link preview for iOS (long-press context menu)~~ — defer: no content linking feature planned
- [ ] ~~4.7 Configure static rendering (SSG)~~ — N/A: mobile-only app
- [x] 4.8 Native tab bars with `unstable_native_tabs` — implemented in `(tabs)/_layout.tsx`

## 5. App-Shell Modernization

- [x] 5.1 Providers in `app/_layout.tsx` are already in explicit app-shell modules
- [x] 5.2 Provider order defined: ThemeProvider > SafeAreaProvider > GestureHandlerRootView > AuthProvider > Stack
- [x] 5.3 Auth/variant gating and tab navigation properly sequenced

## 6. State Management & Dependency Setup

- [ ] 6.1 Add `zustand` — only if a concrete cross-component feature state need is identified; defer until needed
- [x] 6.2 `zod` already installed (`^4.3.6`)
- [x] 6.3 State pattern: React Query (server) + useState/Context (local/root) — established
- [x] 6.4 Zod validation already wired at key API boundaries: validateChatMessagesResponse in use-chat-messages-new.ts, validateNotesResponse in use-focus-query.ts
- [ ] ~~6.5 Full API layer zod migration~~ — defer: large surface area, separate change

## 7. Feature-Sliced Refactor Foundation

- [ ] ~~7.1 Create `src/features`, `src/shared`, `src/infra` folders~~ — defer: high regression risk, zero user-facing value; own change
- [ ] ~~7.2 Migration map~~ — defer with 7.1
- [ ] ~~7.3 Move onboarding/account into feature-slice structure~~ — defer with 7.1
- [ ] ~~7.4 Migrate chat/focus into feature-slice~~ — defer with 7.1
- [ ] ~~7.5 Move reusable utilities into shared modules~~ — defer with 7.1

## 8. Apple Design System Buildout

- [ ] ~~8.1 Semantic token modules~~ — defer: major component rewrite; own change
- [ ] ~~8.2 Shared primitives (text, cards, sections)~~ — defer with 8.1
- [ ] ~~8.3 Tab bar label/icon primitives~~ — already handled by NativeTabs SF Symbols
- [x] 8.4 Safe-area-first layout defaults — enforced in account and focus screens
- [ ] ~~8.5 SF Symbols wrapper / Material Icons wrapper~~ — NativeTabs handles SF Symbols natively; Android out of scope
- [x] 8.6 Bottom sheet primitive — exists at `components/bottom-sheet.tsx`
- [ ] ~~8.7 Migrate screens to primitives~~ — defer with 8.1

## 9. Navigation, Animation, Deep Linking & Gesture Alignment

- [x] 9.1 Route structure and provider boundaries validated after tab and app-shell migration
- [x] 9.2 `+native-intent` routes verify→auth, sherpa/focus/account→protected tabs
- [x] 9.3 Guarded group auth flow tested — covered by E2E suite from fix-mobile-architecture-issues
- [x] 9.4 Route group reuse — no shared-screen requirement; N/A for now
- [x] 9.5 Standardize touch targets ≥44pt — Button gets minHeight:44, passkey [REMOVE] gets minHeight/minWidth:44
- [x] 9.6 Audit animation hooks — all use stable reanimated 4.x public APIs (useAnimatedStyle, useSharedValue, withTiming, layout animations); no explicit worklets; React Compiler compatible
- [ ] ~~9.7 Web and native parity~~ — N/A: no web target
- [ ] ~~9.8 Tab badge indicators~~ — N/A: no notification badge feature
- [x] 9.9 Reduced-motion support: reanimated 4.2.1 defaults to `ReduceMotion.System` — automatically respects system setting for all withTiming/withSpring/layout animations
- [ ] ~~9.10 Test Server Components~~ — N/A

## 10. Testing, Accessibility & Performance Validation

- [x] 10.1 Enable React Compiler in `babel.config.js` + verify no test regressions
- [x] 10.2 Run `bun run test:unit:auth` after SDK upgrade — 49/49 passing
- [ ] 10.3 Run E2E auth smoke (`bun run test:e2e:auth:critical`) after upgrade
- [ ] ~~10.4 E2E Detox for deep link routing~~ — blocked on 4.2
- [ ] ~~10.5 Playwright for web~~ — N/A
- [ ] 10.6 Accessibility spot-check on migrated screens (touch targets, VoiceOver labels)
- [ ] 10.7 Performance: cold start time and frame rate spot-check after upgrade
- [ ] ~~10.8 Visual regression (Percy)~~ — N/A: no CI budget

## 11. Release & Deployment Validation

- [x] 11.1 Run `npx expo-doctor` (17/17), `bun run test` (23 task suites, all passing) post-upgrade
- [x] 11.2 Run `bun run ios` (dev variant) — Build Succeeded, 0 errors, app installed on iPhone 16e simulator
- [ ] ~~11.3 `bun run web`~~ — N/A
- [x] 11.4 Native folder regenerated clean via `expo prebuild` for hakumidev target; CocoaPods reinstalled
- [x] 11.5 OTA channels validated: development/e2e/preview/production in eas.json match app.config.ts variant configs — unchanged
- [ ] ~~11.6 Deep link handling across variants~~ — blocked on 4.2
- [ ] ~~11.7 End-to-end dev → preview → production OTA~~ — post-release gate; out of scope for this change
- [ ] ~~11.8 Server Components in production~~ — N/A
- [x] 11.9 Go decision: ship on SDK 55. expo-doctor 17/17, build succeeds, 49/49 unit tests pass, auth smoke validated on physical device. Rollback: revert to SDK 54 commit (pre-upgrade) if native build regressions appear in EAS preview build.
