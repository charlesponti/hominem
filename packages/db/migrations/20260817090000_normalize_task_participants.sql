-- +goose Up
-- +goose StatementBegin

CREATE TEMP TABLE task_participant_person_map (
  task_participant_id uuid PRIMARY KEY,
  person_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO task_participant_person_map (task_participant_id, person_id)
SELECT participant.id, uuidv7()
FROM app.task_participants AS participant
WHERE participant.person_id IS NULL;

INSERT INTO app.people (id, owner_userId, display_name, metadata)
SELECT
  map.person_id,
  task.owner_userId,
  participant.display_name,
  jsonb_build_object(
    'migration', '20260817090000_normalize_task_participants',
    'legacyTaskParticipantId', participant.id
  )
FROM task_participant_person_map AS map
JOIN app.task_participants AS participant ON participant.id = map.task_participant_id
JOIN app.tasks AS task ON task.id = participant.task_id;

INSERT INTO app.person_contact_methods (
  owner_userId,
  person_id,
  kind,
  value,
  is_primary,
  source
)
SELECT task.owner_userId, map.person_id, 'email', participant.email, true, 'task_participant'
FROM task_participant_person_map AS map
JOIN app.task_participants AS participant ON participant.id = map.task_participant_id
JOIN app.tasks AS task ON task.id = participant.task_id
WHERE participant.email IS NOT NULL;

UPDATE app.task_participants AS participant
SET person_id = map.person_id
FROM task_participant_person_map AS map
WHERE participant.id = map.task_participant_id;

ALTER TABLE app.task_participants
  DROP CONSTRAINT IF EXISTS task_participants_pkey,
  DROP CONSTRAINT IF EXISTS task_participants_person_id_fkey;

ALTER TABLE app.task_participants
  ALTER COLUMN person_id SET NOT NULL,
  ADD CONSTRAINT task_participants_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES app.people(id) ON DELETE CASCADE,
  ADD CONSTRAINT task_participants_pkey PRIMARY KEY (task_id, person_id),
  DROP COLUMN id,
  DROP COLUMN display_name,
  DROP COLUMN email;

DROP INDEX IF EXISTS app.app_task_participants_task_id_idx;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE app.task_participants
  DROP CONSTRAINT IF EXISTS task_participants_pkey,
  DROP CONSTRAINT IF EXISTS task_participants_person_id_fkey,
  ALTER COLUMN person_id DROP NOT NULL,
  ADD COLUMN id uuid,
  ADD COLUMN display_name text,
  ADD COLUMN email text;

UPDATE app.task_participants AS participant
SET
  id = uuidv7(),
  display_name = COALESCE(person.display_name, NULLIF(concat_ws(' ', person.first_name, person.last_name), ''), 'Unknown person'),
  email = email_contact.value
FROM app.people AS person
LEFT JOIN LATERAL (
  SELECT contact.value
  FROM app.person_contact_methods AS contact
  WHERE contact.person_id = person.id
    AND contact.kind = 'email'
  ORDER BY contact.is_primary DESC, contact.createdAt ASC
  LIMIT 1
) AS email_contact ON true
WHERE participant.person_id = person.id;

ALTER TABLE app.task_participants
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN display_name SET NOT NULL,
  ADD CONSTRAINT task_participants_pkey PRIMARY KEY (id),
  ADD CONSTRAINT task_participants_person_id_fkey
    FOREIGN KEY (person_id) REFERENCES app.people(id) ON DELETE SET NULL;

CREATE INDEX app_task_participants_task_id_idx
  ON app.task_participants (task_id);

DELETE FROM app.person_contact_methods
WHERE person_id IN (
  SELECT id
  FROM app.people
  WHERE metadata ->> 'migration' = '20260817090000_normalize_task_participants'
);
DELETE FROM app.people
WHERE metadata ->> 'migration' = '20260817090000_normalize_task_participants';

-- +goose StatementEnd
