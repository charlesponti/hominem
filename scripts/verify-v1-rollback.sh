#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/test-env.sh"
source "$ROOT_DIR/scripts/lib/temp-db.sh"

seed_file="$ROOT_DIR/packages/db/seeds/v1_demo_seed.sql"
setup_temp_database "$ROOT_DIR" "v1_rollback"

cleanup() {
  cleanup_temp_database
}

trap cleanup EXIT

create_temp_database

migrate_temp_database "$ROOT_DIR"

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'app'
      AND table_name = 'tags'
      AND column_name = 'slug'
  ) THEN
    RAISE EXCEPTION 'expected tag migration to add app.tags.slug before rollback';
  END IF;
END
$$;
SQL

DATABASE_URL="$TEMP_DB_URL" GOOSE_MIGRATIONS_DIR="${GOOSE_MIGRATIONS_DIR:-$ROOT_DIR/packages/db/migrations_v1}" "$ROOT_DIR/scripts/run-goose.sh" down >/dev/null

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'app'
      AND table_name = 'tags'
      AND column_name = 'slug'
  ) THEN
    RAISE EXCEPTION 'expected app.tags.slug to be removed after rollback';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name = 'space_tags'
  ) THEN
    RAISE EXCEPTION 'expected app.space_tags to be removed after rollback';
  END IF;
END
$$;
SQL

migrate_temp_database "$ROOT_DIR"
seed_temp_database "$seed_file"

printf '%s\n' 'v1 rollback test passed'
