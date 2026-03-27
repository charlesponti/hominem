#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/test-env.sh"

load_test_env "$ROOT_DIR"

database_url="${DATABASE_URL:-$DEV_DATABASE_URL}"
seed_file="${SEED_FILE:-$ROOT_DIR/packages/db/seeds/v1_demo_seed.sql}"
migrations_dir="${GOOSE_MIGRATIONS_DIR:-$ROOT_DIR/packages/db/migrations}"

if ! command -v psql >/dev/null 2>&1; then
  printf '%s\n' 'psql is required but not installed' >&2
  exit 1
fi

if [[ ! -f "$seed_file" ]]; then
  printf 'seed file not found: %s\n' "$seed_file" >&2
  exit 1
fi

DATABASE_URL="$database_url" GOOSE_MIGRATIONS_DIR="$migrations_dir" "$ROOT_DIR/scripts/run-goose.sh" up >/dev/null
psql "$database_url" -v ON_ERROR_STOP=1 -f "$seed_file"

printf 'seeded v1 demo data into %s\n' "$database_url"
