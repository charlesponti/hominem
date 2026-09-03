#!/usr/bin/env bash
# Two-phase E2E login for the Omiro Maestro suite.
#
# Why two phases: the OTP is generated server-side when the app taps "send",
# and OTPs are never served over HTTP (by design). Maestro's JS sandbox has
# no filesystem access, so the only way a code enters a flow is `-e OTP=...`
# injected from this shell — which can read the scripted mailbox file that
# the dev API appends captures to (scripted capture is the local-dev default).
#
# Phase 1 runs auth-send-otp.yaml (email -> send -> OTP screen, app stays
# put), this script polls the mailbox for the fresh code, phase 2 runs
# auth-verify-otp.yaml (type code -> verify -> inbox). Phase 2 must NOT
# re-send: a fresh send invalidates the captured code.
#
# Prerequisites: local dev API (scripted capture is the default; explicit
# ENV=scripted enables it explicitly), app installed on the booted
# simulator. The wrapper force-resets the app to a clean signed-out state
# first (terminate + wipe Documents/mmkv + clear keychain) so a stale
# query cache or resume target can't strand the login on a 404'd detail
# screen. No manual log-out needed.
#
# Usage: ./maestro-auth.sh [email]   (default: e2e@test.hakumi.io)
# Env:   E2E_USER_EMAIL, HOMINEM_SCRIPTED_MAILBOX (same default as the API)
#        APP_ID (default: com.pontistudios.hakumi.dev)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUBFLOWS_DIR="$(cd "$SCRIPT_DIR/../subflows" && pwd)"
TESTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

export PATH="$HOME/.maestro/bin:/opt/homebrew/opt/openjdk@17/bin:$PATH"
export JAVA_HOME="${JAVA_HOME:-/opt/homebrew/opt/openjdk@17}"
export MAESTRO_CLI_NO_ANALYTICS=true
export MAESTRO_DISABLE_UPDATE_CHECK=true

EMAIL="${1:-${E2E_USER_EMAIL:-e2e@test.hakumi.io}}"
MAILBOX="${HOMINEM_SCRIPTED_MAILBOX:-$HOME/.hominem/scripted-mailbox.jsonl}"
APP_ID="${APP_ID:-com.pontistudios.hakumi.dev}"

command -v maestro >/dev/null || { echo "maestro not found (expected at ~/.maestro/bin/maestro)" >&2; exit 1; }
command -v jq >/dev/null || { echo "jq not found" >&2; exit 1; }

# Keep direct use of this documented bootstrap safe too. The canonical runner
# performs the same cleanup before its broader preflight.
pkill -f "\.maestro/lib" 2>/dev/null || true
pkill -f "test-without-building" 2>/dev/null || true
pkill -f "maestro-driver-iosUITests-Runner" 2>/dev/null || true
sleep 1

read_otp() {
  [ -f "$MAILBOX" ] || return 0
  jq -R -r --arg email "$EMAIL" \
    'fromjson? | select(.to == $email and (.otp | type) == "string") | "\(.capturedAt) \(.otp)"' \
    "$MAILBOX" 2>/dev/null | sort | tail -n 1 | awk '{print $2}'
}

echo "== reset: wiping persisted app state (mmkv) + keychain =="
xcrun simctl terminate booted "$APP_ID" 2>/dev/null || true
APP_DATA="$(xcrun simctl get_app_container booted "$APP_ID" data 2>/dev/null || true)"
if [ -n "$APP_DATA" ] && [ -d "$APP_DATA/Documents/mmkv" ]; then
  rm -rf "$APP_DATA/Documents/mmkv"
fi
maestro test --config "$TESTS_DIR/config.yaml" "$SUBFLOWS_DIR/reset-app-state.yaml"

echo "== phase 1: requesting OTP for $EMAIL (fresh signed-out state) =="
# Snapshot the mailbox BEFORE the send: the capture is near-instant, so
# reading "before" after phase 1 would already include the new code and the
# poll below would never find a *different* one.
before="$(read_otp)"
maestro test --config "$TESTS_DIR/config.yaml" -e "E2E_USER_EMAIL=$EMAIL" "$SUBFLOWS_DIR/auth-send-otp.yaml"
otp=""
deadline=$(( $(date +%s) + 60 ))
while [ -z "$otp" ] && [ "$(date +%s)" -lt "$deadline" ]; do
  candidate="$(read_otp)"
  if [ -n "$candidate" ] && [ "$candidate" != "$before" ]; then
    otp="$candidate"
  else
    sleep 1
  fi
done
if [ -z "$otp" ]; then
  echo "no NEW OTP for $EMAIL in $MAILBOX after phase 1." >&2
  echo "Local email capture may be disabled, or the auth screen did not load." >&2
  exit 1
fi

echo "== phase 2: verifying OTP (code masked, never printed) =="
maestro test --config "$TESTS_DIR/config.yaml" -e "E2E_USER_EMAIL=$EMAIL" -e "OTP=$otp" "$SUBFLOWS_DIR/auth-verify-otp.yaml"
maestro test --config "$TESTS_DIR/config.yaml" "$SUBFLOWS_DIR/assert-authenticated.yaml"
echo "authenticated as $EMAIL"
