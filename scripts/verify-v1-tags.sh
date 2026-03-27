#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/test-env.sh"

load_test_env "$ROOT_DIR"

if ! command -v psql >/dev/null 2>&1; then
  printf '%s\n' 'psql is required but not installed' >&2
  exit 1
fi

template_url="$TEST_DATABASE_URL"
template_name="$(database_name_from_url "$template_url")"
database_name="$(sanitize_database_name "${template_name}_v1_tags_$(date +%s)_$$_${RANDOM}")"
database_url="$(database_url_base "$template_url")/${database_name}$(database_url_query "$template_url")"
admin_url="$(database_admin_url "$template_url")"
seed_file="$ROOT_DIR/packages/db/seeds/v1_demo_seed.sql"

cleanup() {
  psql "$admin_url" -v ON_ERROR_STOP=1 <<SQL >/dev/null
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '${database_name}'
  AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS "${database_name}";
SQL
}

trap cleanup EXIT

psql "$admin_url" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${database_name}\" TEMPLATE template0" >/dev/null
DATABASE_URL="$database_url" GOOSE_MIGRATIONS_DIR="${GOOSE_MIGRATIONS_DIR:-$ROOT_DIR/packages/db/migrations_v1}" "$ROOT_DIR/scripts/run-goose.sh" up >/dev/null
psql "$database_url" -v ON_ERROR_STOP=1 -f "$seed_file" >/dev/null

psql "$database_url" -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  tag_slug text;
  alias_count integer;
  assignment_count integer;
BEGIN
  SELECT slug INTO tag_slug
  FROM app.tags
  WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  IF tag_slug <> 'wedding' THEN
    RAISE EXCEPTION 'expected seeded tag slug to be wedding, got %', tag_slug;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM app.tags
    WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
      AND path <@ 'wedding'::public.ltree
  ) THEN
    RAISE EXCEPTION 'expected seeded tag path to match ltree hierarchy';
  END IF;

  SELECT count(*) INTO alias_count
  FROM app.tag_aliases
  WHERE tag_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    AND alias_slug = 'wedding-planning';

  IF alias_count <> 1 THEN
    RAISE EXCEPTION 'expected seeded tag alias to exist, saw % rows', alias_count;
  END IF;

  SELECT count(*) INTO assignment_count
  FROM app.tag_assignments
  WHERE tag_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    AND removed_at IS NULL;

  IF assignment_count <> 1 THEN
    RAISE EXCEPTION 'expected 1 active seeded tag assignment, saw % rows', assignment_count;
  END IF;

  UPDATE app.tag_assignments
  SET removed_at = now()
  WHERE tag_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    AND entity_table = 'app.tasks'::regclass
    AND entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  INSERT INTO app.tag_assignments (
    tag_id,
    entity_table,
    entity_id,
    assigned_by_user_id,
    assignment_source,
    confidence
  )
  VALUES (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'app.tasks'::regclass,
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'agent',
    0.9
  );

  SELECT count(*) INTO assignment_count
  FROM app.tag_assignments
  WHERE tag_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
    AND entity_table = 'app.tasks'::regclass
    AND entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF assignment_count <> 2 THEN
    RAISE EXCEPTION 'expected historical and active tag assignments after reassignment, saw % rows', assignment_count;
  END IF;
END
$$;
SQL

printf '%s\n' 'v1 tag model test passed'
