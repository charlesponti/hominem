-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.task_external_projections (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES app.tasks(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_id text NOT NULL,
  external_list_id text,
  sync_status text NOT NULL DEFAULT 'pending',
  external_updated_at timestamptz,
  last_synced_at timestamptz,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_task_external_projections_provider_not_blank CHECK (
    length(btrim(provider)) > 0
  ),
  CONSTRAINT app_task_external_projections_external_id_not_blank CHECK (
    length(btrim(external_id)) > 0
  ),
  CONSTRAINT app_task_external_projections_external_list_id_not_blank CHECK (
    external_list_id IS NULL OR length(btrim(external_list_id)) > 0
  ),
  CONSTRAINT app_task_external_projections_sync_status_check CHECK (
    sync_status IN ('pending', 'synced', 'conflict', 'error', 'deleted')
  ),
  CONSTRAINT app_task_external_projections_error_message_check CHECK (
    (sync_status = 'error' AND error_message IS NOT NULL)
    OR (sync_status <> 'error' AND error_message IS NULL)
  )
);

CREATE UNIQUE INDEX app_task_external_projections_task_provider_key
  ON app.task_external_projections (task_id, provider);

CREATE UNIQUE INDEX app_task_external_projections_owner_provider_external_key
  ON app.task_external_projections (owner_userId, provider, external_id);

CREATE INDEX app_task_external_projections_pending_idx
  ON app.task_external_projections (owner_userId, updatedAt)
  WHERE sync_status IN ('pending', 'conflict', 'error');

CREATE TRIGGER app_task_external_projections_set_updated_at
  BEFORE UPDATE ON app.task_external_projections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE app.task_external_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_external_projections FORCE ROW LEVEL SECURITY;

CREATE POLICY app_task_external_projections_owner_policy ON app.task_external_projections
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (
    auth.is_service_role()
    OR (
      owner_userId = auth.current_user_id()
      AND EXISTS (
        SELECT 1
        FROM app.tasks task
        WHERE task.id = task_external_projections.task_id
          AND task.owner_userId = auth.current_user_id()
      )
    )
  );

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP POLICY IF EXISTS app_task_external_projections_owner_policy
  ON app.task_external_projections;
ALTER TABLE app.task_external_projections NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.task_external_projections DISABLE ROW LEVEL SECURITY;
DROP TRIGGER IF EXISTS app_task_external_projections_set_updated_at
  ON app.task_external_projections;
DROP TABLE IF EXISTS app.task_external_projections;

-- +goose StatementEnd
