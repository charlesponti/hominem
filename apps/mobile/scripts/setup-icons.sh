#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/_lib.sh"

VARIANT="${1:?usage: setup-icons.sh <dev|e2e|preview|production>}"
SCRIPTS_DIR="$(dirname "$0")"
ASSETS_DIR="$(dirname "$SCRIPTS_DIR")/assets"

header "Setup Icons · $VARIANT"

# Map variant to logo file
case "$VARIANT" in
  dev|e2e)
    LOGO_FILE="logo.hakumi.dev.png"
    ;;
  preview)
    LOGO_FILE="logo.hakumi.preview.png"
    ;;
  production)
    LOGO_FILE="logo.hakumi.png"
    ;;
  *)
    error "Unknown variant: $VARIANT"
    exit 1
    ;;
esac

APP_ROOT="$(dirname "$SCRIPTS_DIR")"

# Copy appropriate logo to assets/icon.png
info "Copying $LOGO_FILE → assets/icon.png"
cp "$APP_ROOT/$LOGO_FILE" "$ASSETS_DIR/icon.png"

# Copy splash screen
info "Copying logo.hakumi.splash-screen.png → assets/splash.png"
cp "$APP_ROOT/logo.hakumi.splash-screen.png" "$ASSETS_DIR/splash.png"

# For Android, also update the adaptive icon (same as main icon for now)
info "Updating assets/adaptive-icon.png"
cp "$APP_ROOT/$LOGO_FILE" "$ASSETS_DIR/adaptive-icon.png"

# Generate iOS icons from the base icon using ImageMagick
info "Generating iOS icon set from assets/icon.png"
IOS_ICONS_DIR="$ASSETS_DIR/ios/AppIcon.appiconset"

# Define all required iOS icon sizes
declare -a SIZES=(
  "20x20@1x~ipad"
  "20x20@2x"
  "20x20@2x~ipad"
  "20x20@3x"
  "29x29@1x~ipad"
  "29x29@2x"
  "29x29@2x~ipad"
  "29x29@3x"
  "40x40@1x~ipad"
  "40x40@2x"
  "40x40@2x~ipad"
  "40x40@3x"
  "60x60@2x"
  "60x60@3x"
  "76x76@1x~ipad"
  "76x76@2x~ipad"
  "83.5x83.5@2x~ipad"
  "1024x1024@1x"
)

# Convert sizes to actual dimensions and generate
for size_spec in "${SIZES[@]}"; do
  # Extract dimension and scale
  IFS='@' read -r base_size scale <<< "$size_spec"
  
  # Special handling for non-square sizes (83.5x83.5@2x)
  if [[ "$base_size" == "83.5x83.5" ]]; then
    dimension=167
  else
    IFS='x' read -r width height <<< "$base_size"
    
    # Apply scale multiplier
    case "$scale" in
      "2x"*) dimension=$((width * 2)) ;;
      "3x"*) dimension=$((width * 3)) ;;
      *) dimension=$width ;;
    esac
  fi
  
  output_file="$IOS_ICONS_DIR/Icon-App-${base_size}@${scale}.png"
  
  # Only generate if not already present or if source is newer
  if [[ ! -f "$output_file" ]] || [[ "$APP_ROOT/$LOGO_FILE" -nt "$output_file" ]]; then
    magick "$ASSETS_DIR/icon.png" -resize "${dimension}x${dimension}!" "$output_file"
  fi
done

info "Icon setup complete"
