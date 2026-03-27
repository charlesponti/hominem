SELECT set_config('app.is_service_role', 'true', false);
SELECT set_config('app.current_user_id', '', false);

DELETE FROM app.entity_links
WHERE id = '99999999-9999-9999-9999-999999999999';

DELETE FROM app.space_items
WHERE id IN (
  '90909090-9090-9090-9090-909090909090',
  '91919191-9191-9191-9191-919191919191',
  '92929292-9292-9292-9292-929292929292'
);

DELETE FROM app.tag_assignments
WHERE tag_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  AND entity_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

DELETE FROM app.task_assignments
WHERE task_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

DELETE FROM app.note_shares
WHERE note_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  AND shared_with_user_id = '22222222-2222-2222-2222-222222222222';

DELETE FROM ops.audit_logs
WHERE id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

DELETE FROM app.note_versions
WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

DELETE FROM app.note_versions
WHERE id = '82828282-8282-8282-8282-828282828282';

DELETE FROM app.bookmarks
WHERE id = '73737373-7373-7373-7373-737373737373';

DELETE FROM app.places
WHERE id = '72727272-7272-7272-7272-727272727272';

DELETE FROM app.people
WHERE id = '71717171-7171-7171-7171-717171717171';

DELETE FROM app.chat_messages
WHERE id = 'abababab-abab-abab-abab-abababababab';

DELETE FROM app.chats
WHERE id = 'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd';

DELETE FROM app.tasks
WHERE id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

DELETE FROM app.space_members
WHERE space_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  AND user_id = '22222222-2222-2222-2222-222222222222';

DELETE FROM app.spaces
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

DELETE FROM app.tags
WHERE id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';

DELETE FROM app.notes
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

DELETE FROM app.notes
WHERE id = '81818181-8181-8181-8181-818181818181';

DELETE FROM auth.users
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

INSERT INTO auth.users (id, email, display_name)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', 'Alice'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', 'Bob'),
  ('33333333-3333-3333-3333-333333333333', 'carol@example.com', 'Carol');

INSERT INTO app.people (id, owner_user_id, first_name, last_name, email)
VALUES (
  '71717171-7171-7171-7171-717171717171',
  '11111111-1111-1111-1111-111111111111',
  'Jamie',
  'Planner',
  'jamie@example.com'
);

INSERT INTO app.places (id, owner_user_id, name, address, place_type)
VALUES (
  '72727272-7272-7272-7272-727272727272',
  '11111111-1111-1111-1111-111111111111',
  'Venue',
  '123 Market St, Los Angeles, CA',
  'venue'
);

INSERT INTO app.bookmarks (id, owner_user_id, title, url)
VALUES (
  '73737373-7373-7373-7373-737373737373',
  '11111111-1111-1111-1111-111111111111',
  'Planner board',
  'https://example.com/planner'
);

INSERT INTO app.notes (id, owner_user_id, source)
VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'manual');

INSERT INTO app.note_versions (
  id,
  note_id,
  created_by_user_id,
  version_number,
  title,
  content,
  note_type,
  status
)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  1,
  'Shared note',
  'hello',
  'note',
  'draft'
);

UPDATE app.notes
SET current_version_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

INSERT INTO app.notes (id, owner_user_id, source)
VALUES ('81818181-8181-8181-8181-818181818181', '11111111-1111-1111-1111-111111111111', 'manual');

INSERT INTO app.note_versions (
  id,
  note_id,
  created_by_user_id,
  version_number,
  title,
  content,
  note_type,
  status
)
VALUES (
  '82828282-8282-8282-8282-828282828282',
  '81818181-8181-8181-8181-818181818181',
  '11111111-1111-1111-1111-111111111111',
  1,
  'Space-only note',
  'visible through space membership',
  'note',
  'draft'
);

UPDATE app.notes
SET current_version_id = '82828282-8282-8282-8282-828282828282'
WHERE id = '81818181-8181-8181-8181-818181818181';

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

INSERT INTO app.tags (id, owner_user_id, name, color)
VALUES (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '11111111-1111-1111-1111-111111111111',
  'wedding',
  '#f59e0b'
);

INSERT INTO app.spaces (id, owner_user_id, name, color, icon)
VALUES ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'Team', '#2563eb', 'users');

INSERT INTO app.space_members (space_id, user_id, added_by_user_id)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111'
);

INSERT INTO app.chats (id, owner_user_id, primary_space_id, note_id, title, source)
VALUES (
  'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd',
  '11111111-1111-1111-1111-111111111111',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Wedding planning chat',
  'manual'
);

INSERT INTO app.chat_messages (
  id,
  chat_id,
  author_user_id,
  role,
  content
)
VALUES (
  'abababab-abab-abab-abab-abababababab',
  'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd',
  '11111111-1111-1111-1111-111111111111',
  'user',
  'Plan the wedding next steps'
);

INSERT INTO app.tasks (id, owner_user_id, primary_space_id, title)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '11111111-1111-1111-1111-111111111111',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'Ship v1'
);

INSERT INTO app.task_assignments (
  task_id,
  primary_space_id,
  assignee_user_id,
  assigned_by_user_id
)
VALUES (
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111'
);

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

INSERT INTO app.space_items (
  id,
  space_id,
  entity_table,
  entity_id,
  added_by_user_id
)
VALUES
  (
    '90909090-9090-9090-9090-909090909090',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'app.notes'::regclass,
    '81818181-8181-8181-8181-818181818181',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '91919191-9191-9191-9191-919191919191',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'app.chats'::regclass,
    'cdcdcdcd-cdcd-cdcd-cdcd-cdcdcdcdcdcd',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '92929292-9292-9292-9292-929292929292',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'app.tasks'::regclass,
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '93939393-9393-9393-9393-939393939393',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'app.people'::regclass,
    '71717171-7171-7171-7171-717171717171',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '94949494-9494-9494-9494-949494949494',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'app.places'::regclass,
    '72727272-7272-7272-7272-727272727272',
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '95959595-9595-9595-9595-959595959595',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'app.bookmarks'::regclass,
    '73737373-7373-7373-7373-737373737373',
    '11111111-1111-1111-1111-111111111111'
  );

INSERT INTO app.entity_links (
  id,
  owner_user_id,
  space_id,
  from_entity_table,
  from_entity_id,
  relation_type,
  to_entity_table,
  to_entity_id
)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  '11111111-1111-1111-1111-111111111111',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'app.notes'::regclass,
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'supports',
  'app.tasks'::regclass,
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);

INSERT INTO ops.audit_logs (id, actor_user_id, action)
VALUES (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  'seeded'
);

SELECT set_config('app.is_service_role', 'false', false);
