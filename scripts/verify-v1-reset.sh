#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/test-env.sh"
source "$ROOT_DIR/scripts/lib/temp-db.sh"

seed_file="$ROOT_DIR/packages/db/seeds/v1_demo_seed.sql"
setup_temp_database "$ROOT_DIR" "v1_reset"

cleanup() {
  cleanup_temp_database
}

trap cleanup EXIT

create_temp_database
migrate_temp_database "$ROOT_DIR"
seed_temp_database "$seed_file"

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name = 'space_items'
  ) THEN
    RAISE EXCEPTION 'expected app.space_items to exist before reset';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'app'
      AND table_name = 'tags'
      AND column_name = 'slug'
  ) THEN
    RAISE EXCEPTION 'expected app.tags.slug to exist before reset';
  END IF;
END
$$;
SQL

DATABASE_URL="$TEMP_DB_URL" GOOSE_MIGRATIONS_DIR="${GOOSE_MIGRATIONS_DIR:-$ROOT_DIR/packages/db/migrations_v1}" "$ROOT_DIR/scripts/run-goose.sh" reset >/dev/null

version_after_reset="$(
  psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 -At <<'SQL'
SELECT COALESCE(max(version_id) FILTER (WHERE is_applied), 0)
FROM public.goose_db_version;
SQL
)"

if [ "$version_after_reset" != "0" ]; then
  printf '%s\n' "expected goose version 0 after reset, saw $version_after_reset" >&2
  exit 1
fi

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'app'
      AND table_name = 'space_items'
  ) THEN
    RAISE EXCEPTION 'expected app.space_items to be removed by reset';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'app'
      AND table_name = 'tags'
      AND column_name = 'slug'
  ) THEN
    RAISE EXCEPTION 'expected app.tags.slug to be removed by reset';
  END IF;
END
$$;
SQL

migrate_temp_database "$ROOT_DIR"
seed_temp_database "$seed_file"

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  entity_count integer;
BEGIN
  SELECT count(*) INTO entity_count
  FROM app.space_items
  WHERE space_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid;

  IF entity_count <> 6 THEN
    RAISE EXCEPTION 'expected reseed after reset to restore 6 space items, saw %', entity_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM app.tags
    WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
      AND slug = 'wedding'
  ) THEN
    RAISE EXCEPTION 'expected reseed after reset to restore wedding tag slug';
  END IF;
END
$$;
SQL

printf '%s\n' 'v1 full reset smoke test passed'
