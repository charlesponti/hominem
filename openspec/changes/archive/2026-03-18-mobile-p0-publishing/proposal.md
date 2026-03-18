## Why

The mobile app ships to users with no visibility into production errors, deploys OTA updates to 100% of users simultaneously with no ability to pause or roll back, and has no automated path to publish production binaries to TestFlight — all of which are blockers to safely operating a production app.

## What Changes

- Add PostHog React Native SDK to capture exceptions, errors, and analytics events
- Wire PostHog exception capture into the existing three-tier error boundary system
- Add PostHog session recording and feature flag support as a foundation for data-driven rollouts
- Configure EAS Update Groups in `eas.json` for staged OTA rollout (10% → 50% → 100%)
- Add `build:update:preview:rollout` scripts to package.json for managing rollout stages
- Create a GitHub Actions workflow (`mobile-production-release.yml`) that builds the production binary and submits to TestFlight via `eas submit`

## Capabilities

### New Capabilities

- `mobile-observability`: PostHog integration for error capture, analytics, and session recording in the React Native app
- `mobile-staged-rollout`: EAS Update Groups configuration enabling percentage-based OTA rollout with pause/promote/rollback controls
- `mobile-production-release-ci`: GitHub Actions workflow for automated production binary builds and TestFlight submission

### Modified Capabilities

- `mobile-error-boundaries`: Error boundaries now forward captured exceptions to PostHog in addition to the in-memory log

## Impact

- **New dependency**: `posthog-react-native` added to `apps/mobile`
- **Modified files**: `apps/mobile/app.config.ts` (PostHog plugin), error boundary utils, `eas.json` (update groups), `apps/mobile/package.json` (rollout scripts)
- **New files**: `.github/workflows/mobile-production-release.yml`, `apps/mobile/lib/posthog.ts`
- **New secrets required**: `POSTHOG_API_KEY` (GitHub + EAS), `EXPO_APPLE_ID`, `EXPO_ASC_APP_ID` (GitHub, for submit)
- **No breaking changes** to existing OTA deploy workflow or build profiles
