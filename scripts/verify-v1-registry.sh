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
database_name="$(sanitize_database_name "${template_name}_v1_registry_$(date +%s)_$$_${RANDOM}")"
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
  entity_count integer;
  primary_space_id_value uuid;
BEGIN
  SELECT count(*) INTO entity_count
  FROM app.entities
  WHERE (entity_table, entity_id) IN (
    ('app.notes'::regclass, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid),
    ('app.chats'::regclass, 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd'::uuid),
    ('app.spaces'::regclass, 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid),
    ('app.tasks'::regclass, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid)
  );

  IF entity_count <> 4 THEN
    RAISE EXCEPTION 'expected seeded entities to be registered, saw % rows', entity_count;
  END IF;

  SELECT primary_space_id INTO primary_space_id_value
  FROM app.entities
  WHERE entity_table = 'app.chats'::regclass
    AND entity_id = 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd';

  IF primary_space_id_value <> 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid THEN
    RAISE EXCEPTION 'expected chat entity primary space binding to sync';
  END IF;

  SELECT primary_space_id INTO primary_space_id_value
  FROM app.entities
  WHERE entity_table = 'app.tasks'::regclass
    AND entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF primary_space_id_value <> 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid THEN
    RAISE EXCEPTION 'expected task entity primary space binding to sync';
  END IF;

  DELETE FROM app.task_assignments
  WHERE task_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  UPDATE app.tasks
  SET primary_space_id = NULL
  WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  SELECT primary_space_id INTO primary_space_id_value
  FROM app.entities
  WHERE entity_table = 'app.tasks'::regclass
    AND entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF primary_space_id_value IS NOT NULL THEN
    RAISE EXCEPTION 'expected entity registry primary space binding to clear on task update';
  END IF;

  UPDATE app.tasks
  SET primary_space_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid
  WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  DELETE FROM app.tasks
  WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  SELECT count(*) INTO entity_count
  FROM app.entities
  WHERE entity_table = 'app.tasks'::regclass
    AND entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF entity_count <> 0 THEN
    RAISE EXCEPTION 'expected task entity registry row to be deleted';
  END IF;

  SELECT count(*) INTO entity_count
  FROM app.tag_assignments
  WHERE entity_table = 'app.tasks'::regclass
    AND entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF entity_count <> 0 THEN
    RAISE EXCEPTION 'expected task tag assignments to cascade from registry delete';
  END IF;

  SELECT count(*) INTO entity_count
  FROM app.entity_links
  WHERE to_entity_table = 'app.tasks'::regclass
    AND to_entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF entity_count <> 0 THEN
    RAISE EXCEPTION 'expected task entity links to cascade from registry delete';
  END IF;

  SELECT count(*) INTO entity_count
  FROM app.space_items
  WHERE entity_table = 'app.tasks'::regclass
    AND entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  IF entity_count <> 0 THEN
    RAISE EXCEPTION 'expected task space memberships to cascade from registry delete';
  END IF;
END
$$;
SQL

printf '%s\n' 'v1 entity registry test passed'
