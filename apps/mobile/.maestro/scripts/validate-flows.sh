#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
APP_ID="com.pontistudios.mindsherpa.dev"

if ! command -v maestro >/dev/null 2>&1; then
  echo "maestro is not installed"
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

if ! xcrun simctl list devices booted | rg -q "Booted"; then
  DEVICE_UDID="$(xcrun simctl list devices available | awk -F '[()]' '/iPhone/ && /Shutdown/ {print $2; exit}')"
  if [[ -z "${DEVICE_UDID}" ]]; then
    echo "no available iPhone simulator found"
    exit 1
  fi

  xcrun simctl boot "${DEVICE_UDID}" >/dev/null 2>&1 || true
  xcrun simctl bootstatus "${DEVICE_UDID}" -b >/dev/null 2>&1 || true
fi

if ! xcrun simctl list devices booted | rg -q "Booted"; then
  echo "no booted simulator detected"
  exit 1
fi

if ! xcrun simctl get_app_container booted "${APP_ID}" app >/dev/null 2>&1; then
  echo "app ${APP_ID} is not installed on booted simulator"
  echo "build/install dev client first:"
  echo "  bun run --filter @hominem/mobile ios"
  exit 1
fi

maestro test --format NOOP "$ROOT_DIR/apps/mobile/.maestro/flows/smoke/app-launch.yaml"
