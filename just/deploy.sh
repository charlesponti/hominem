#!/usr/bin/env bash
set -euo pipefail

service_name="${1:-}"
CONFIG="${2:-}"

case "$service_name" in api|career|workers) ;; *) echo "error: unknown Railway service '$service_name'" >&2; exit 1 ;; esac
[[ -n "${CONFIG:-}" ]] || { echo 'error: config path required' >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

[[ -f "$SCRIPT_DIR/$CONFIG" ]] || { echo "error: Railway config not found: $CONFIG" >&2; exit 1; }
[[ -n "${SERVICE:-}" ]] || { echo 'error: SERVICE must be set' >&2; exit 1; }
[[ -n "${RAILWAY_TOKEN:-}" ]] || { echo 'error: RAILWAY_TOKEN must be set' >&2; exit 1; }
[[ ! -e "$SCRIPT_DIR/railway.json" ]] || { echo 'error: railway.json already exists at the repository root' >&2; exit 1; }

cp "$SCRIPT_DIR/$CONFIG" "$SCRIPT_DIR/railway.json"
trap 'rm -f "$SCRIPT_DIR/railway.json"' EXIT

cd "$SCRIPT_DIR"
set +e
pnpm exec railway up --ci --service "$SERVICE" 2>&1 | tee /tmp/railway-up.log
status=${PIPESTATUS[0]}
set -e

if [[ "$status" -ne 0 ]]; then
  grep -Eo 'https://railway\.com/project/[^[:space:]]+' /tmp/railway-up.log | tail -n 1 | sed 's/^/Railway build logs: /' >&2 || true
  tail -n 80 /tmp/railway-up.log || true
  exit "$status"
fi
