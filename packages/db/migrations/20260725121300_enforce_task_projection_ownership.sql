-- +goose Up
-- +goose StatementBegin

ALTER TABLE app.tasks
  ADD CONSTRAINT app_tasks_id_owner_key UNIQUE (id, owner_userId);

ALTER TABLE app.task_external_projections
  ADD CONSTRAINT app_task_external_projections_task_owner_fkey
  FOREIGN KEY (task_id, owner_userId)
  REFERENCES app.tasks(id, owner_userId)
  ON DELETE CASCADE;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE app.task_external_projections
  DROP CONSTRAINT IF EXISTS app_task_external_projections_task_owner_fkey;

ALTER TABLE app.tasks
  DROP CONSTRAINT IF EXISTS app_tasks_id_owner_key;

-- +goose StatementEnd
