#!/usr/bin/env bash
set -euo pipefail

service_name="${1:-}"
CONFIG="${2:-}"

case "$service_name" in api|career|workers) ;; *) echo "error: unknown Railway service '$service_name'" >&2; exit 1 ;; esac
[[ -n "${CONFIG:-}" ]] || { echo 'error: config path required' >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

[[ -f "$SCRIPT_DIR/$CONFIG" ]] || { echo "error: Railway config not found: $CONFIG" >&2; exit 1; }
SERVICE="${SERVICE:-$service_name}"
[[ -n "${RAILWAY_TOKEN:-}" ]] || { echo 'error: RAILWAY_TOKEN must be set' >&2; exit 1; }
[[ ! -e "$SCRIPT_DIR/railway.json" ]] || { echo 'error: railway.json already exists at the repository root' >&2; exit 1; }

cp "$SCRIPT_DIR/$CONFIG" "$SCRIPT_DIR/railway.json"
trap 'rm -f "$SCRIPT_DIR/railway.json"' EXIT

RAILWAY_VERSION="5.25.1"

case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) RAILWAY_TRIPLE="x86_64-unknown-linux-gnu" ;;
  Linux-aarch64) RAILWAY_TRIPLE="aarch64-unknown-linux-musl" ;;
  Darwin-arm64) RAILWAY_TRIPLE="aarch64-apple-darwin" ;;
  Darwin-x86_64) RAILWAY_TRIPLE="x86_64-apple-darwin" ;;
  *) echo "error: unsupported platform for the railway CLI" >&2; exit 1 ;;
esac

RAILWAY_BIN_DIR="$HOME/.railway/bin"
RAILWAY_BIN="$RAILWAY_BIN_DIR/railway"
if [[ ! -x "$RAILWAY_BIN" ]]; then
  mkdir -p "$RAILWAY_BIN_DIR"
  curl -fsSL -o /tmp/railway.tar.gz \
    "https://github.com/railwayapp/cli/releases/download/v${RAILWAY_VERSION}/railway-v${RAILWAY_VERSION}-${RAILWAY_TRIPLE}.tar.gz"
  tar xzf /tmp/railway.tar.gz -C "$RAILWAY_BIN_DIR"
  rm -f /tmp/railway.tar.gz
fi

cd "$SCRIPT_DIR"
set +e
"$RAILWAY_BIN" up --ci --service "$SERVICE" 2>&1 | tee /tmp/railway-up.log
status=${PIPESTATUS[0]}
set -e

if [[ "$status" -ne 0 ]]; then
  grep -Eo 'https://railway\.com/project/[^[:space:]]+' /tmp/railway-up.log | tail -n 1 | sed 's/^/Railway build logs: /' >&2 || true
  tail -n 80 /tmp/railway-up.log || true
  exit "$status"
fi
