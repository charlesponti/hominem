#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/test-env.sh"
source "$ROOT_DIR/scripts/lib/temp-db.sh"

client_role="hominem_v1_rls_tester"
seed_file="$ROOT_DIR/packages/db/seeds/v1_demo_seed.sql"
setup_temp_database "$ROOT_DIR" "v1_rls"

cleanup() {
  cleanup_temp_database
}

trap cleanup EXIT

psql "$TEMP_DB_ADMIN_URL" -v ON_ERROR_STOP=1 <<SQL >/dev/null
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

create_temp_database
migrate_temp_database "$ROOT_DIR"

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<SQL
GRANT USAGE ON SCHEMA auth, app, ops TO ${client_role};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth, app, ops TO ${client_role};
SQL

seed_temp_database "$seed_file"

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
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

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
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

  SELECT count(*) INTO visible_count FROM app.tags;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 shared tag, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.space_tags;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 shared space tag, saw %', visible_count;
  END IF;

  SELECT count(*) INTO visible_count FROM app.tag_aliases;
  IF visible_count <> 1 THEN
    RAISE EXCEPTION 'expected bob to see 1 shared tag alias, saw %', visible_count;
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

  UPDATE app.tags
  SET name = 'Bob Edit Attempt'
  WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 0 THEN
    RAISE EXCEPTION 'expected bob tag update to affect 0 rows, got %', updated_count;
  END IF;
END
$$;
RESET ROLE;
SQL

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
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

psql "$TEMP_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
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
