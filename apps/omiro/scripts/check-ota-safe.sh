#!/usr/bin/env bash
set -euo pipefail

# Fails fast if the ref being OTA'd needs a new native binary instead.
#
# Compares the CNG fingerprint of the current checkout against the
# fingerprint recorded on the most recent finished production build. An
# OTA update can only ever ship JS/asset changes -- if the fingerprint
# differs, something (a native dependency bump, a config plugin, an
# Info.plist/entitlement change, ...) requires a real App Store build via
# deploy-mobile + mobile-store-release instead.

app_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
temp_dir="$(mktemp -d "${TMPDIR:-/tmp}/omiro-ota-safe.XXXXXX")"

: "${EXPO_TOKEN:?EXPO_TOKEN must be set to check OTA safety}"

restore_native_dir() {
  if [[ -d "$temp_dir/ios" && ! -e "$app_dir/ios" ]]; then
    mv "$temp_dir/ios" "$app_dir/ios"
  fi
  rm -rf "$temp_dir"
}
trap restore_native_dir EXIT

if [[ -d "$app_dir/ios" ]]; then
  mv "$app_dir/ios" "$temp_dir/ios"
fi

cd "$app_dir"
APP_ENV=production NODE_ENV=production \
  EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-https://cng.invalid}" \
  pnpm exec expo prebuild --platform ios --clean --no-install >/dev/null

current_fingerprint="$(
  APP_ENV=production NODE_ENV=production \
    EXPO_PUBLIC_API_BASE_URL="${EXPO_PUBLIC_API_BASE_URL:-https://cng.invalid}" \
    pnpm dlx eas-cli@21.2.0 fingerprint:generate \
      --json --non-interactive --platform ios --build-profile production \
    | node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(0, "utf8")).hash)'
)"

latest_build_json="$temp_dir/latest-build.json"
pnpm dlx eas-cli@21.2.0 build:list \
  --platform ios --build-profile production --status finished \
  --limit 1 --json --non-interactive > "$latest_build_json"

latest_fingerprint="$(node -e '
  const builds = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const build = Array.isArray(builds) ? builds[0] : builds;
  process.stdout.write(build?.fingerprint?.hash ?? "");
' "$latest_build_json")"

if [[ -z "$latest_fingerprint" ]]; then
  echo "error: could not find a finished production build to compare against." >&2
  echo "Cannot verify this ref is OTA-safe. Check EAS build history, or run" >&2
  echo "deploy-mobile if you're unsure." >&2
  exit 1
fi

if [[ "$current_fingerprint" != "$latest_fingerprint" ]]; then
  echo "error: this ref's native fingerprint doesn't match the last shipped production build." >&2
  echo "  current:  $current_fingerprint" >&2
  echo "  shipped:  $latest_fingerprint" >&2
  echo >&2
  echo "This means something needs a new native binary (native dependency bump," >&2
  echo "config plugin, permissions/entitlements, etc.) -- an OTA update can't ship" >&2
  echo "it. Run deploy-mobile, then mobile-store-release, instead." >&2
  exit 1
fi

echo "OTA-safe: fingerprint matches the last shipped production build ($current_fingerprint)."
