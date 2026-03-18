## Context

The mobile app (`apps/mobile`) currently has three production gaps:

1. **No error visibility**: The existing `logError` utility stores errors in a 50-entry in-memory array. Errors are lost on restart with no alerting or aggregation.
2. **All-or-nothing OTA**: Every `eas update` deploys to 100% of users on the channel with no staged rollout or rollback capability.
3. **No automated production path**: Production binaries require manual `eas build` + `eas submit` invocations; there is no CI workflow.

## Goals / Non-Goals

**Goals:**
- Capture exceptions in production via PostHog and surface them in the PostHog dashboard
- Forward all `logError` calls to PostHog with context (feature, route, userId)
- Enable percentage-based OTA rollout via EAS Update Groups
- Automate production binary builds and TestFlight submission via GitHub Actions

**Non-Goals:**
- Replacing the existing in-memory error log (PostHog supplements it)
- Android build/submit automation (iOS only for now)
- PostHog session recording (can be enabled later; opt-in)
- Migrating feature flags from `utils/feature-flags.ts` to PostHog (future work)

## Decisions

### PostHog SDK initialisation location
**Decision**: Initialise PostHog in a `lib/posthog.ts` singleton, imported once in the root `_layout.tsx` via the `PostHogProvider`.

**Rationale**: PostHog React Native requires a provider at the tree root for session tracking and feature flags. A singleton avoids multiple initialisations across hot reloads. Alternatives considered: initialising inside `app.config.ts` plugin (not possible — runtime only) or lazy init per boundary (causes multiple clients).

### Exception capture integration point
**Decision**: Call `posthog.capture('$exception', ...)` inside the existing `logError` function in `utils/error-boundary/log-error.ts`.

**Rationale**: All three error boundary tiers (root, feature, and error logging utility) funnel through `logError`. A single integration point avoids duplication and keeps boundaries unaware of PostHog directly. The PostHog client is imported from the singleton — no prop drilling needed.

### PostHog API key exposure
**Decision**: Expose the PostHog API key as `EXPO_PUBLIC_POSTHOG_API_KEY` (public env var).

**Rationale**: PostHog project API keys are designed to be public (client-side analytics). They are scoped to a project and cannot access data — only ingest it. EAS environment variable with "Plain text" visibility is appropriate. Alternatives considered: server-side proxy (unnecessary complexity for a client SDK).

### Staged OTA rollout mechanism
**Decision**: Use EAS Update Groups with a `rollout` field to define 10%/50%/100% stages. Promote via `eas update:rollout` commands in package.json scripts.

**Rationale**: EAS Update Groups are the native EAS mechanism for staged rollouts. They tie directly into the existing channel/branch model without requiring additional infrastructure. Alternatives considered: custom update server (too much overhead), LaunchDarkly flags (overkill, we already have PostHog feature flags).

### Production CI trigger
**Decision**: `mobile-production-release.yml` triggers on `workflow_dispatch` only (manual).

**Rationale**: Production binary releases should always be a deliberate human action — not triggered automatically on every push to main. OTA updates (via `mobile-ota-deploy.yml`) handle continuous delivery to preview. Production binaries are infrequent and require App Store review. Alternatives considered: tag-based trigger (added complexity with no clear benefit given low release cadence).

## Risks / Trade-offs

- **PostHog ingestion noise** → Mitigation: Filter out `__DEV__` errors (already guarded in `logError`); set a sampling rate for non-fatal events if volume becomes high.
- **EAS Update Group limits** → EAS enforces limits on active update groups per project. Mitigation: archive completed rollouts promptly using `eas update:rollout --set 100` to graduate before creating new ones.
- **TestFlight submission credentials** → `eas submit` requires `EXPO_APPLE_ID` and `EXPO_ASC_APP_ID`. These must be added as GitHub secrets before the workflow can run. Mitigation: workflow includes a preflight check step that fails fast if secrets are absent.
- **`appleTeamId` fingerprint** → Resolved: hardcoded as `process.env.EXPO_APPLE_TEAM_ID ?? '3QHJ2KN8AL'` in `app.config.ts`.

## Migration Plan

1. Add PostHog package and plugin → run `expo prebuild` for dev variant to regenerate native project
2. Deploy to preview channel via existing OTA workflow → validate errors appear in PostHog dashboard
3. Configure EAS Update Groups in `eas.json` — no user-facing change, existing channel routing preserved
4. Add GitHub secrets (`POSTHOG_API_KEY`, `EXPO_APPLE_ID`, `EXPO_ASC_APP_ID`) before running the production release workflow

**Rollback**: PostHog can be disabled by removing the provider wrapper and `EXPO_PUBLIC_POSTHOG_API_KEY`. EAS Update Groups can be set to 100% immediately to complete a rollout or rolled back via `eas update:rollout --delete`.

## Open Questions

- Should PostHog session recording be enabled from day one or deferred? (Recommendation: defer — enable opt-in via feature flag once error capture is validated.)
- What PostHog project/region to use? (EU cloud vs US cloud affects data residency.)
