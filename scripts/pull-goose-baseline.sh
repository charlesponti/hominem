#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
MIGRATIONS_DIR="${ROOT_DIR}/packages/db/migrations"
TIMESTAMP="${GOOSE_BASELINE_TIMESTAMP:-$(date -u +%Y%m%d%H%M%S)}"
FILE_NAME="${TIMESTAMP}_schema_baseline.sql"
BASELINE_FILE="${MIGRATIONS_DIR}/${FILE_NAME}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

if ! command -v pg_dump-18 >/dev/null 2>&1 && ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required"
  exit 1
fi

mkdir -p "$MIGRATIONS_DIR"
TMP_DUMP="$(mktemp /tmp/hominem-goose-baseline.XXXXXX.sql)"
trap 'rm -f "$TMP_DUMP"' EXIT

PG_DUMP_BIN="pg_dump"
if command -v pg_dump-18 >/dev/null 2>&1; then
  PG_DUMP_BIN="pg_dump-18"
fi

"$PG_DUMP_BIN" "$DATABASE_URL" --schema-only --no-owner --no-acl > "$TMP_DUMP"

{
  echo '-- +goose Up'
  echo '-- +goose StatementBegin'
  awk '$0 !~ /^\\/ && $0 !~ /SELECT pg_catalog.set_config\\('\"'\"'search_path'\"'\"', '\"'\"''\"'\"', false\\);/' "$TMP_DUMP"
  echo '-- +goose StatementEnd'
  echo
  echo '-- +goose Down'
  echo "DO \$\$ BEGIN RAISE NOTICE 'baseline down migration is intentionally a no-op'; END \$\$;"
} > "$BASELINE_FILE"

echo "Created baseline migration: $BASELINE_FILE"
