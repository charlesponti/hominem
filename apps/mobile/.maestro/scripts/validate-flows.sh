#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
APP_ID="com.pontistudios.mindsherpa.dev"
APP_NAME="hakumidev"

check_prerequisites() {
  if ! command -v maestro >/dev/null 2>&1; then
    echo "maestro is not installed"
    echo "Install: curl -Ls https://get.maestro.mobile.dev | bash"
    exit 1
  fi

  if ! command -v java >/dev/null 2>&1; then
    echo "java is not installed"
    exit 1
  fi

  JAVA_VERSION="$(java -version 2>&1 | head -n 1)"
  if [[ "$JAVA_VERSION" != *"17"* && "$JAVA_VERSION" != *"18"* && "$JAVA_VERSION" != *"19"* && "$JAVA_VERSION" != *"20"* && "$JAVA_VERSION" != *"21"* ]]; then
    echo "java 17+ required, got: $JAVA_VERSION"
    exit 1
  fi
}

get_booted_device() {
  local booted_udid
  booted_udid="$(xcrun simctl list devices booted | grep -oE '[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}' | head -1)"
  echo "$booted_udid"
}

get_available_device() {
  local udid
  udid="$(xcrun simctl list devices available | grep -oE 'iPhone.*[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}' | head -1 | grep -oE '[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}')"
  echo "$udid"
}

wait_for_device() {
  local device_udid="$1"
  local max_attempts=30
  local attempt=0

  while [[ $attempt -lt $max_attempts ]]; do
    if xcrun simctl list devices booted | grep -q "$device_udid"; then
      return 0
    fi
    sleep 1
    ((attempt++))
  done

  return 1
}

ensure_simulator_booted() {
  local booted_udid
  booted_udid="$(get_booted_device)"

  if [[ -n "$booted_udid" ]]; then
    echo "Using already booted simulator: $booted_udid" >&2
    echo "$booted_udid"
    return 0
  fi

  echo "No booted simulator found, attempting to boot..." >&2

  local available_udid
  available_udid="$(get_available_device)"

  if [[ -z "$available_udid" ]]; then
    echo "no available iPhone simulator found" >&2
    exit 1
  fi

  echo "Booting simulator: $available_udid" >&2
  xcrun simctl boot "$available_udid"

  if ! wait_for_device "$available_udid"; then
    echo "failed to boot simulator" >&2
    exit 1
  fi

  echo "Simulator booted successfully: $available_udid" >&2
  echo "$available_udid"
}

check_app_installed() {
  local device_udid="$1"
  
  if xcrun simctl listapps "$device_udid" 2>/dev/null | grep -qi "\"$APP_ID\""; then
    return 0
  fi
  
  if xcrun simctl listapps "$device_udid" 2>/dev/null | grep -qi "\"$APP_NAME\""; then
    return 0
  fi
  
  return 1
}

main() {
  check_prerequisites

  local device_udid
  device_udid="$(ensure_simulator_booted)"

  if ! check_app_installed "$device_udid"; then
    echo "app ${APP_ID} is not installed on simulator"
    echo "Build/install dev client first:"
    echo "  bun run --filter @hominem/mobile ios"
    exit 1
  fi

  echo "Running Maestro smoke test..."
  maestro test --device "$device_udid" "$ROOT_DIR/apps/mobile/.maestro/flows/smoke/app-launch.yaml"
}

main "$@"
