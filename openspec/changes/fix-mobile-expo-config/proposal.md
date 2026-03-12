## Why

Mobile release workflows are failing because Expo owner and project identifiers drifted across repo files, and `expo config` resolution is brittle in this Bun-managed workspace. We need one consistent source of truth for Expo app identity and a reliable config path so OTA and TestFlight releases stop breaking on routine deploys.

## What Changes

- Align mobile Expo owner and project metadata so app config, deployment docs, and operational reference files no longer disagree.
- Fix the mobile app config path used by Expo/EAS so `expo config` works in this monorepo without relying on a fallback parser.
- Keep the scope limited to mobile release configuration and verification; no product behavior changes.

## Capabilities

### New Capabilities
- `mobile-expo-config-consistency`: Ensure mobile release configuration exposes a single consistent Expo owner/project identity and can be resolved by Expo tooling in local and CI release flows.

### Modified Capabilities

## Impact

- `apps/mobile/app.config.ts`
- `apps/mobile/package.json`
- `apps/mobile` release and verification commands
- `config/apple-auth.settings.json`
- GitHub Actions and EAS release workflows that depend on Expo config resolution
