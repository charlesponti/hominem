## 1. PostHog Setup

- [x] 1.1 Add `posthog-react-native` to `apps/mobile/package.json` and install
- [x] 1.2 Add `EXPO_PUBLIC_POSTHOG_API_KEY` to EAS environment (preview + production) with Plain text visibility
- [x] 1.3 Add `EXPO_PUBLIC_POSTHOG_API_KEY` to `.env.development.local` (can be empty/dev key for local)
- [x] 1.4 Create `apps/mobile/lib/posthog.ts` singleton that initialises the PostHog client from `EXPO_PUBLIC_POSTHOG_API_KEY`
- [x] 1.5 Add `PostHogProvider` to the root `apps/mobile/app/_layout.tsx` wrapping the app tree
- [x] 1.6 Add PostHog Expo config plugin to `app.config.ts` plugins array — N/A, no native plugin required

## 2. Error Boundary Integration

- [x] 2.1 Update `apps/mobile/utils/error-boundary/log-error.ts` to import the PostHog singleton and call `posthog.capture('$exception', {...})` in non-dev environments
- [x] 2.2 Include `feature`, `route`, and `userId` as PostHog event properties
- [x] 2.3 Verify no PostHog calls fire when `__DEV__` is true

## 3. User Identity

- [x] 3.1 Call `posthog.identify(userId)` after successful auth session establishment
- [x] 3.2 Call `posthog.reset()` on sign-out

## 4. Staged OTA Rollout

- [x] 4.1 Add `channel` rollout configuration to the `preview` profile in `eas.json` — handled via `--rollout-percentage` flag, no eas.json change needed
- [x] 4.2 Add rollout scripts to `apps/mobile/package.json`:
  - `build:update:preview:rollout:50` — promote to 50%
  - `build:update:preview:rollout:100` — promote to 100%
  - `build:update:preview:rollback` — roll back active rollout
- [x] 4.3 Update `build:update:preview` in `package.json` to publish at 10% rollout by default

## 5. Production Release CI

- [x] 5.1 Create `.github/workflows/mobile-production-release.yml` with `workflow_dispatch` trigger
- [x] 5.2 Add secrets preflight step verifying `EXPO_TOKEN`, `EXPO_APPLE_ID`, `EXPO_ASC_APP_ID` are set
- [x] 5.3 Add pre-release gates: typecheck, unit tests, verify expo config, verify EAS env (production)
- [x] 5.4 Add `eas build --profile production --platform ios --non-interactive` step
- [x] 5.5 Add `eas submit --profile production --non-interactive` step following successful build
- [x] 5.6 Add `EXPO_APPLE_ID` and `EXPO_ASC_APP_ID` to GitHub repository secrets — manual step

## 6. Validation

- [x] 6.1 Trigger a test error in preview build and confirm it appears in PostHog dashboard
- [x] 6.2 Publish a preview OTA update and confirm rollout starts at 10%
- [x] 6.3 Promote rollout to 100% and confirm all devices receive the update
- [ ] 6.4 Do a dry-run of the production release workflow (`workflow_dispatch`) and confirm it reaches the submit step
