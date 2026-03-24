# Mobile App Icons Setup

This document explains how the mobile app icons are managed for different build variants.

## Icon Files

The following logo files are used for each build variant:

- **Development & E2E**: `logo.hakumi.dev.png`
- **Preview**: `logo.hakumi.preview.png`
- **Production**: `logo.hakumi.png`
- **Splash Screen**: `logo.hakumi.splash-screen.png` (all variants)

## Automatic Icon Generation

The `scripts/setup-icons.sh` script automatically:

1. Copies the appropriate logo based on the build variant to `assets/icon.png`
2. Copies the splash screen to `assets/splash.png`
3. Updates the Android adaptive icon to match
4. Generates all required iOS icon sizes from the main icon using ImageMagick:
   - iPhone icons: 20×20, 29×29, 40×40, 60×60 (all scales)
   - iPad icons: 20×20, 29×29, 40×40, 76×76, 83.5×83.5 (all scales)
   - App Store icon: 1024×1024

## Build Flow

Icon setup is automatically called during:

- `make dev` - Prebuild for development
- `make preview` - Preflight for preview build
- `make release` - Preflight for production build

Manual icon setup:

```bash
# Setup icons for a specific variant
bash scripts/setup-icons.sh <dev|e2e|preview|production>
```

## Icon Requirements

Source logo files should be:
- **Format**: PNG with transparency support
- **Minimum size**: 1024×1024 pixels
- **Color mode**: SRGB or RGBA

## Implementation Details

- Icons are generated using ImageMagick (`magick` command)
- iOS icons are stored in `assets/ios/AppIcon.appiconset/`
- Icon metadata is defined in `assets/ios/AppIcon.appiconset/Contents.json`
- Only regenerates icons if source is newer than existing icons (optimization)
