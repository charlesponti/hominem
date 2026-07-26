-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.task_participants (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  task_id uuid NOT NULL REFERENCES app.tasks(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  display_name text NOT NULL,
  email text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_task_participants_display_name_not_blank CHECK (
    length(btrim(display_name)) > 0
  ),
  CONSTRAINT app_task_participants_email_not_blank CHECK (
    email IS NULL OR length(btrim(email)) > 0
  )
);

CREATE INDEX app_task_participants_task_id_idx
  ON app.task_participants (task_id);

CREATE INDEX app_task_participants_person_id_idx
  ON app.task_participants (person_id)
  WHERE person_id IS NOT NULL;

CREATE TRIGGER app_task_participants_set_updated_at
  BEFORE UPDATE ON app.task_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE app.task_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_participants FORCE ROW LEVEL SECURITY;

CREATE POLICY app_task_participants_owner_policy ON app.task_participants
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.tasks task
      WHERE task.id = task_participants.task_id
        AND task.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.tasks task
      WHERE task.id = task_participants.task_id
        AND task.owner_userId = auth.current_user_id()
    )
  );

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP POLICY IF EXISTS app_task_participants_owner_policy ON app.task_participants;
ALTER TABLE app.task_participants NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.task_participants DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS app_task_participants_set_updated_at ON app.task_participants;
DROP TABLE IF EXISTS app.task_participants;

-- +goose StatementEnd
