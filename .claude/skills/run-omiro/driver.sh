#!/usr/bin/env bash
# Driver for building, launching, and screenshotting the omiro Expo app
# on the iOS Simulator. Run from apps/omiro/ (the script cd's there anyway).
#
# Usage:
#   driver.sh env         # write .env.development.local if missing
#   driver.sh boot        # boot a simulator if none is booted
#   driver.sh build       # expo run:ios (builds native project + installs + launches)
#   driver.sh metro       # start Metro bundler in background (idempotent)
#   driver.sh launch      # (re)launch the already-installed app, connecting to Metro
#   driver.sh screenshot [path]   # capture simulator screen
#   driver.sh status      # show simulator/metro/api state
#   driver.sh all         # env -> boot -> build -> metro -> launch -> screenshot

set -euo pipefail
cd "$(dirname "$0")/../../.."   # -> apps/omiro

APP_DIR="$PWD"
BUNDLE_ID="com.pontistudios.hakumi.dev"
SCHEME="OmiroDev"
METRO_LOG="/tmp/omiro-metro.log"
METRO_PID_FILE="/tmp/omiro-metro.pid"
SIM_NAME_DEFAULT="iPhone 17 Pro"

log() { echo "[driver] $*" >&2; }

booted_udid() {
  xcrun simctl list devices | grep -m1 "(Booted)" | grep -oE '[0-9A-F-]{36}' || true
}

cmd_env() {
  if [ ! -f .env.development.local ]; then
    cp .env.example .env.development.local
    log "wrote .env.development.local from .env.example"
  fi
  # The zod schema uses z.url().optional() for EXPO_PUBLIC_SENTRY_DSN — an
  # empty string still fails .url(), only an ABSENT var satisfies .optional().
  # The .example placeholder value is also not a valid URL, so it must be
  # blanked out entirely (not set to ""), or Metro throws ZodError on every route.
  if grep -q '^EXPO_PUBLIC_SENTRY_DSN=' .env.development.local; then
    sed -i '' '/^EXPO_PUBLIC_SENTRY_DSN=/d' .env.development.local
    log "removed placeholder EXPO_PUBLIC_SENTRY_DSN (invalid URL fails schema)"
  fi
  cat .env.development.local
}

cmd_boot() {
  local udid
  udid=$(booted_udid)
  if [ -n "$udid" ]; then
    log "already booted: $udid"
    echo "$udid"
    return
  fi
  udid=$(xcrun simctl list devices available | grep "$SIM_NAME_DEFAULT" | head -1 | grep -oE '[0-9A-F-]{36}')
  xcrun simctl boot "$udid"
  open -a Simulator
  sleep 3
  log "booted $SIM_NAME_DEFAULT: $udid"
  echo "$udid"
}

cmd_build() {
  # expo run:ios builds the native project, installs, and launches — but its
  # devicectl install step fails ("Install Application not supported") when
  # it targets a simulator UDID that isn't currently booted. Boot first.
  cmd_boot >/dev/null
  APP_ENV=development npx expo run:ios --device "$SIM_NAME_DEFAULT" || {
    log "expo run:ios install step may have failed (known devicectl quirk vs shutdown sims) — falling back to manual install"
    cmd_manual_install
  }
}

cmd_manual_install() {
  local udid app_path bundle
  udid=$(booted_udid)
  app_path=$(find ~/Library/Developer/Xcode/DerivedData/${SCHEME}-*/Build/Products/Debug-iphonesimulator -maxdepth 1 -name "*.app" | head -1)
  [ -n "$app_path" ] || { log "no built .app found — run 'driver.sh build' first"; exit 1; }
  xcrun simctl install "$udid" "$app_path"
  bundle=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$app_path/Info.plist")
  xcrun simctl launch "$udid" "$bundle"
}

cmd_metro() {
  if curl -s http://localhost:8081/status 2>/dev/null | grep -q running; then
    log "Metro already running"
    return
  fi
  cmd_env >/dev/null
  (APP_ENV=development nohup npx expo start --clear > "$METRO_LOG" 2>&1 & echo $! > "$METRO_PID_FILE")
  for _ in $(seq 1 20); do
    curl -s http://localhost:8081/status 2>/dev/null | grep -q running && { log "Metro ready"; return; }
    sleep 1
  done
  log "Metro did not become ready — check $METRO_LOG"
  exit 1
}

cmd_launch() {
  local udid
  udid=$(booted_udid)
  [ -n "$udid" ] || { log "no booted simulator — run 'driver.sh boot' first"; exit 1; }
  xcrun simctl terminate "$udid" "$BUNDLE_ID" 2>/dev/null || true
  sleep 1
  xcrun simctl launch "$udid" "$BUNDLE_ID"
  sleep 6
}

cmd_screenshot() {
  local udid out
  udid=$(booted_udid)
  out="${1:-/tmp/omiro-sim.png}"
  xcrun simctl io "$udid" screenshot "$out"
  log "screenshot -> $out"
}

cmd_status() {
  echo "booted simulator: $(booted_udid || echo none)"
  echo -n "metro: "; curl -s http://localhost:8081/status 2>/dev/null || echo "not running"
  echo
  echo -n "api (localhost:4040): "; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4040/ 2>/dev/null || echo "unreachable"
}

cmd_all() {
  cmd_env
  cmd_boot
  cmd_metro
  cmd_build
  cmd_launch
  cmd_screenshot /tmp/omiro-sim.png
}

case "${1:-}" in
  env) cmd_env ;;
  boot) cmd_boot ;;
  build) cmd_build ;;
  metro) cmd_metro ;;
  launch) cmd_launch ;;
  screenshot) cmd_screenshot "${2:-}" ;;
  status) cmd_status ;;
  all) cmd_all ;;
  *)
    echo "usage: driver.sh {env|boot|build|metro|launch|screenshot [path]|status|all}" >&2
    exit 1
    ;;
esac
