#!/usr/bin/env bash
set -euo pipefail

# Generates mobile app icons from a source PNG.
# Usage: ./scripts/generate-mobile-icons.sh [source.png]
# Defaults to assets/logo.mobile.png

SRC="${1:-assets/logo.mobile.png}"
ICON_DIR="apps/mobile/assets"
IOS_DIR="${ICON_DIR}/ios/AppIcon.appiconset"

if ! command -v magick &>/dev/null; then
  echo "Error: ImageMagick is required. Install with: brew install imagemagick" >&2
  exit 1
fi

if [ ! -f "$SRC" ]; then
  echo "Error: Source image not found: $SRC" >&2
  exit 1
fi

echo "Generating icons from $SRC..."

# Resize helper — always produces a square PNG with transparent padding
resize() {
  magick "$SRC" \
    -resize "${1}x${1}" \
    -background none \
    -gravity center \
    -extent "${1}x${1}" \
    "$2"
}

# Main icon (Expo + iOS)
resize 1024 "${ICON_DIR}/icon.png"
echo "  ✓ icon.png (1024x1024)"

# Android adaptive icon
resize 1024 "${ICON_DIR}/adaptive-icon.png"
echo "  ✓ adaptive-icon.png (1024x1024)"

# iOS icon set
resize 20   "${IOS_DIR}/Icon-App-20x20@1x.png"
resize 40   "${IOS_DIR}/Icon-App-20x20@2x.png"
resize 60   "${IOS_DIR}/Icon-App-20x20@3x.png"
resize 29   "${IOS_DIR}/Icon-App-29x29@1x.png"
resize 58   "${IOS_DIR}/Icon-App-29x29@2x.png"
resize 87   "${IOS_DIR}/Icon-App-29x29@3x.png"
resize 40   "${IOS_DIR}/Icon-App-40x40@1x.png"
resize 80   "${IOS_DIR}/Icon-App-40x40@2x.png"
resize 120  "${IOS_DIR}/Icon-App-40x40@3x.png"
resize 120  "${IOS_DIR}/Icon-App-60x60@2x.png"
resize 180  "${IOS_DIR}/Icon-App-60x60@3x.png"
resize 76   "${IOS_DIR}/Icon-App-76x76@1x.png"
resize 152  "${IOS_DIR}/Icon-App-76x76@2x.png"
resize 167  "${IOS_DIR}/Icon-App-83.5x83.5@2x.png"
resize 1024 "${IOS_DIR}/Icon-App-1024x1024@1x.png"
echo "  ✓ iOS AppIcon.appiconset (15 sizes)"

echo "Done."
