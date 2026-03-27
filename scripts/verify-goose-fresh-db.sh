#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/test-env.sh"
source "$ROOT_DIR/scripts/lib/temp-db.sh"

setup_temp_database "$ROOT_DIR" "verify"

cleanup() {
  cleanup_temp_database
}

trap cleanup EXIT

create_temp_database
DATABASE_URL="$TEMP_DB_URL" "$ROOT_DIR/scripts/run-goose.sh" up >/dev/null
DATABASE_URL="$TEMP_DB_URL" "$ROOT_DIR/scripts/run-goose.sh" up >/dev/null

status="$(DATABASE_URL="$TEMP_DB_URL" "$ROOT_DIR/scripts/run-goose.sh" status)"
printf '%s\n' "$status"

if printf '%s' "$status" | grep -Ei 'Pending|pending' >/dev/null; then
  printf '%s\n' 'pending migrations remain after goose up' >&2
  exit 1
fi
