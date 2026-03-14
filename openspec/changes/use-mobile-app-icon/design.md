## Context

The mobile app currently points Expo at `apps/mobile/assets/icon.png`. A new Hakumi logo PNG has already been converted into a square 1024x1024 master icon and a full iOS app icon set, but those generated assets are not yet the icon Expo uses for builds. This is an asset wiring change, not a runtime logic change.

## Goals / Non-Goals

**Goals:**
- Make Expo builds use the newly generated Hakumi icon asset.
- Keep the generated iOS app icon set available in the repo.
- Verify the mobile config and release checks still pass after the asset update.

**Non-Goals:**
- Redesigning the icon artwork.
- Changing Android adaptive icon composition beyond the existing asset pipeline.
- Updating unrelated branding assets like favicons or header logos.

## Decisions

Use the generated square 1024x1024 Hakumi icon as the canonical Expo app icon asset by replacing `apps/mobile/assets/icon.png`. This keeps the project aligned with Expo’s existing config path without changing runtime configuration.

Retain the generated `AppIcon.appiconset` under `apps/mobile/assets/ios/` as the native-ready source bundle for future iOS asset catalog usage. This avoids regeneration work later while keeping the current Expo-based pipeline simple.

Verify success using the existing mobile Expo config resolution command rather than introducing new build logic. This keeps the change focused and low-risk.

## Risks / Trade-offs

- Replacing `assets/icon.png` affects all Expo-driven builds immediately -> Mitigation: keep the generated source icon committed alongside the replacement for easy rollback.
- The icon artwork may need visual tweaks after device testing -> Mitigation: preserve the original uploaded PNG and generated source assets for fast regeneration.
