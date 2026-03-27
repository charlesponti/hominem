#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/lib/test-env.sh"
source "$ROOT_DIR/scripts/lib/temp-db.sh"

seed_file="$ROOT_DIR/packages/db/seeds/v1_demo_seed.sql"
setup_temp_database "$ROOT_DIR" "v1_rel"

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
  BEGIN
    INSERT INTO app.note_shares (
      note_id,
      shared_with_user_id,
      permission,
      granted_by_user_id
    )
    VALUES (
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '22222222-2222-2222-2222-222222222222',
      'read',
      '11111111-1111-1111-1111-111111111111'
    );
    RAISE EXCEPTION 'expected overlapping note share insert to fail';
  EXCEPTION
    WHEN exclusion_violation OR unique_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO app.space_members (space_id, user_id, added_by_user_id)
    VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '22222222-2222-2222-2222-222222222222',
      '11111111-1111-1111-1111-111111111111'
    );
    RAISE EXCEPTION 'expected overlapping space membership insert to fail';
  EXCEPTION
    WHEN exclusion_violation OR unique_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO app.tag_assignments (
      tag_id,
      entity_table,
      entity_id,
      assigned_by_user_id
    )
    VALUES (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'app.entities'::regclass,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      '11111111-1111-1111-1111-111111111111'
    );
    RAISE EXCEPTION 'expected tag assignment on unregistered table to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO app.space_tags (space_id, tag_id, created_by_user_id)
    VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      '11111111-1111-1111-1111-111111111111'
    );
    RAISE EXCEPTION 'expected duplicate space tag insert to fail';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO app.tag_aliases (tag_id, alias, alias_slug)
    VALUES (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'Wedding Planning',
      'wedding-planning'
    );
    RAISE EXCEPTION 'expected duplicate tag alias slug insert to fail';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO app.tag_assignments (
      tag_id,
      entity_table,
      entity_id,
      assigned_by_user_id
    )
    VALUES (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'app.tasks'::regclass,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      '11111111-1111-1111-1111-111111111111'
    );
    RAISE EXCEPTION 'expected duplicate active tag assignment insert to fail';
  EXCEPTION
    WHEN unique_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO app.tag_assignments (
      tag_id,
      entity_table,
      entity_id,
      assigned_by_user_id,
      assignment_source
    )
    VALUES (
      'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      'app.notes'::regclass,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '11111111-1111-1111-1111-111111111111',
      'nonsense'
    );
    RAISE EXCEPTION 'expected invalid tag assignment source to fail';
  EXCEPTION
    WHEN check_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO app.task_assignments (
      task_id,
      primary_space_id,
      assignee_user_id,
      assigned_by_user_id,
      assignment_period
    )
    VALUES (
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      '33333333-3333-3333-3333-333333333333',
      '11111111-1111-1111-1111-111111111111',
      tstzrange(now(), 'infinity'::timestamptz, '[)')
    );
    RAISE EXCEPTION 'expected task assignment outside membership to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO app.space_items (
      space_id,
      entity_table,
      entity_id,
      added_by_user_id
    )
    VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'app.tasks'::regclass,
      'dddddddd-dddd-dddd-dddd-dddddddddddd',
      '11111111-1111-1111-1111-111111111111'
    );
    RAISE EXCEPTION 'expected overlapping active space item insert to fail';
  EXCEPTION
    WHEN exclusion_violation OR unique_violation THEN
      NULL;
  END;

  BEGIN
    INSERT INTO app.space_items (
      space_id,
      entity_table,
      entity_id,
      added_by_user_id,
      position
    )
    VALUES (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'app.notes'::regclass,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      '11111111-1111-1111-1111-111111111111',
      1
    );
    RAISE EXCEPTION 'expected unordered space item position insert to fail';
  EXCEPTION
    WHEN raise_exception THEN
      NULL;
  END;

  INSERT INTO app.notes (id, owner_user_id, source)
  VALUES (
    '12121212-1212-1212-1212-121212121212',
    '11111111-1111-1111-1111-111111111111',
    'manual'
  );

  INSERT INTO app.note_versions (
    id,
    note_id,
    created_by_user_id,
    version_number,
    title,
    content
  )
  VALUES (
    '13131313-1313-1313-1313-131313131313',
    '12121212-1212-1212-1212-121212121212',
    '11111111-1111-1111-1111-111111111111',
    1,
    'Other note',
    'other'
  );

  BEGIN
    UPDATE app.notes
    SET current_version_id = '13131313-1313-1313-1313-131313131313'
    WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'expected mismatched note head update to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;

  INSERT INTO app.chats (id, owner_user_id, title, source)
  VALUES
    (
      '14141414-1414-1414-1414-141414141414',
      '11111111-1111-1111-1111-111111111111',
      'First chat',
      'manual'
    ),
    (
      '15151515-1515-1515-1515-151515151515',
      '11111111-1111-1111-1111-111111111111',
      'Second chat',
      'manual'
    );

  INSERT INTO app.chat_messages (id, chat_id, author_user_id, role, content, created_at)
  VALUES (
    '16161616-1616-1616-1616-161616161616',
    '14141414-1414-1414-1414-141414141414',
    '11111111-1111-1111-1111-111111111111',
    'user',
    'hello',
    now() + interval '1 hour'
  );

  BEGIN
    INSERT INTO app.chat_messages (
      id,
      chat_id,
      author_user_id,
      parent_message_id,
      role,
      content
    )
    VALUES (
      '17171717-1717-1717-1717-171717171717',
      '15151515-1515-1515-1515-151515151515',
      '11111111-1111-1111-1111-111111111111',
      '16161616-1616-1616-1616-161616161616',
      'assistant',
      'cross-chat reply'
    );
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'expected cross-chat parent reference to fail';
  EXCEPTION
    WHEN foreign_key_violation THEN
      NULL;
  END;

  IF (
    SELECT chat.last_message_at
    FROM app.chats chat
    WHERE chat.id = '14141414-1414-1414-1414-141414141414'
  ) < (
    SELECT message.created_at
    FROM app.chat_messages message
    WHERE message.id = '16161616-1616-1616-1616-161616161616'
  ) THEN
    RAISE EXCEPTION 'expected chat last_message_at to track latest message timestamp';
  END IF;
END
$$;
SQL

printf '%s\n' 'v1 relational integrity test passed'
