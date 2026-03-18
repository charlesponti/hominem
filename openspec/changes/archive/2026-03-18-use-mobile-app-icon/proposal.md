## Why

The mobile project now has a generated Hakumi app icon asset set, but Expo is still wired to the previous icon file. We need the project to use the new icon so development builds, release builds, and App Store assets all reflect the updated branding consistently.

## What Changes

- Replace the mobile app’s primary Expo icon asset with the generated Hakumi icon.
- Preserve a valid square master icon for Expo and keep the generated iOS icon set alongside it for native use.
- Verify the mobile Expo config still resolves successfully after the asset swap.

## Capabilities

### New Capabilities
- `mobile-app-icon-branding`: Ensure the mobile project uses the generated Hakumi app icon across Expo-driven build outputs.

### Modified Capabilities

## Impact

- `apps/mobile/assets/icon.png`
- `apps/mobile/assets/ios/icon-1024.png`
- `apps/mobile/assets/ios/AppIcon.appiconset`
- `apps/mobile/app.config.ts`
- mobile release verification commands
