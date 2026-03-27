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
database_name="$(sanitize_database_name "${template_name}_v1_rls_$(date +%s)_$$_${RANDOM}")"
database_url="$(database_url_base "$template_url")/${database_name}$(database_url_query "$template_url")"
admin_url="$(database_admin_url "$template_url")"
client_role="hominem_v1_rls_tester"
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

psql "$admin_url" -v ON_ERROR_STOP=1 <<SQL >/dev/null
DO \$\$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = '${client_role}'
  ) THEN
    EXECUTE 'CREATE ROLE ${client_role} NOSUPERUSER NOINHERIT';
  END IF;
END
\$\$;
SQL

psql "$admin_url" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"${database_name}\" TEMPLATE template0" >/dev/null
DATABASE_URL="$database_url" GOOSE_MIGRATIONS_DIR="${GOOSE_MIGRATIONS_DIR:-$ROOT_DIR/packages/db/migrations_v1}" "$ROOT_DIR/scripts/run-goose.sh" up >/dev/null

psql "$database_url" -v ON_ERROR_STOP=1 <<SQL
GRANT USAGE ON SCHEMA auth, app, ops TO ${client_role};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth, app, ops TO ${client_role};
SQL

psql "$database_url" -v ON_ERROR_STOP=1 -f "$seed_file"

psql "$database_url" -v ON_ERROR_STOP=1 <<'SQL'
SET ROLE hominem_v1_rls_tester;
DO $$
DECLARE
  visible_count integer;
  updated_count integer;
BEGIN
  PERFORM set_config('app.current_user_id', '11111111-1111-1111-1111-111111111111', false);
  PERFORM set_config('app.is_service_role', 'false', false);

  SELECT count(*) INTO visible_count FROM auth.users;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected alice to see only herself, saw % rows', visible_count;
  END IF;

  UPDATE auth.users
  SET display_name = 'Alice Updated'
  WHERE id = '11111111-1111-1111-1111-111111111111';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'expected alice self update to affect 1 row, got %', updated_count;
  END IF;

  UPDATE auth.users
  SET display_name = 'Bob Hacked'
  WHERE id = '22222222-2222-2222-2222-222222222222';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 0 THEN
    RAISE EXCEPTION 'expected alice update on bob to affect 0 rows, got %', updated_count;
  END IF;
END
$$;
RESET ROLE;
SQL

psql "$database_url" -v ON_ERROR_STOP=1 <<'SQL'
SET ROLE hominem_v1_rls_tester;
DO $$
DECLARE
  visible_count integer;
  updated_count integer;
BEGIN
  PERFORM set_config('app.current_user_id', '22222222-2222-2222-2222-222222222222', false);
  PERFORM set_config('app.is_service_role', 'false', false);

  SELECT count(*) INTO visible_count FROM app.notes;
  IF visible_count <> 2 THEN
    RAISE EXCEPTION 'expected bob to see 2 visible notes, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.note_versions;
  IF visible_count <> 2 THEN
    RAISE EXCEPTION 'expected bob to see 2 visible note versions, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.spaces;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 member space, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.chats;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 shared chat, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.chat_messages;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 shared chat message, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.space_items;
  IF visible_count <> 6 THEN
    RAISE EXCEPTION 'expected bob to see 6 visible space items, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.people;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 contained person, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.places;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 contained place, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.bookmarks;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 contained bookmark, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.tag_assignments;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 shared tag assignment, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.entity_links;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 shared space entity link, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM ops.audit_logs;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'expected bob to see 0 ops audit logs, saw %', visible_count;
  END IF;

  UPDATE app.spaces
  SET name = 'Bob Edit Attempt'
  WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 0 THEN
    RAISE EXCEPTION 'expected bob space update to affect 0 rows, got %', updated_count;
  END IF;

  UPDATE app.people
  SET first_name = 'Bob Edit Attempt'
  WHERE id = '71717171-7171-7171-7171-717171717171';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 0 THEN
    RAISE EXCEPTION 'expected bob person update to affect 0 rows, got %', updated_count;
  END IF;
END
$$;
RESET ROLE;
SQL

psql "$database_url" -v ON_ERROR_STOP=1 <<'SQL'
SET ROLE hominem_v1_rls_tester;
DO $$
DECLARE
  visible_count integer;
BEGIN
  PERFORM set_config('app.current_user_id', '33333333-3333-3333-3333-333333333333', false);
  PERFORM set_config('app.is_service_role', 'false', false);

  SELECT count(*) INTO visible_count FROM app.notes;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'expected carol to see 0 notes, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.spaces;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'expected carol to see 0 spaces, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.people;
  IF visible_count <> 0 THEN
    RAISE EXCEPTION 'expected carol to see 0 people, saw %', visible_count;
  END IF;
END
$$;
RESET ROLE;
SQL

psql "$database_url" -v ON_ERROR_STOP=1 <<'SQL'
SET ROLE hominem_v1_rls_tester;
DO $$
DECLARE
  visible_count integer;
BEGIN
  PERFORM set_config('app.current_user_id', '', false);
  PERFORM set_config('app.is_service_role', 'true', false);

  SELECT count(*) INTO visible_count FROM ops.audit_logs;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected service role to see 1 audit log, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM auth.users;
  IF visible_count <> 3 THEN
    RAISE EXCEPTION 'expected service role to see 3 users, saw %', visible_count;
  END IF;
END
$$;
RESET ROLE;
SQL

printf '%s\n' 'v1 RLS smoke test passed'
