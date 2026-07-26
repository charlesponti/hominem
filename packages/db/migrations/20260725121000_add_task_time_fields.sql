-- +goose Up
-- +goose StatementBegin

ALTER TABLE app.tasks
  ADD COLUMN duration_minutes integer,
  ADD COLUMN scheduling_window_start_at timestamptz,
  ADD COLUMN scheduling_window_end_at timestamptz,
  ADD COLUMN scheduled_start_at timestamptz,
  ADD COLUMN scheduled_end_at timestamptz,
  ADD COLUMN time_zone text,
  ADD COLUMN location text,
  ADD CONSTRAINT app_tasks_duration_positive_check CHECK (
    duration_minutes IS NULL OR duration_minutes > 0
  ),
  ADD CONSTRAINT app_tasks_scheduling_window_check CHECK (
    scheduling_window_start_at IS NULL
    OR scheduling_window_end_at IS NULL
    OR scheduling_window_end_at > scheduling_window_start_at
  ),
  ADD CONSTRAINT app_tasks_scheduled_interval_check CHECK (
    (scheduled_start_at IS NULL AND scheduled_end_at IS NULL)
    OR (
      scheduled_start_at IS NOT NULL
      AND scheduled_end_at IS NOT NULL
      AND scheduled_end_at > scheduled_start_at
    )
  ),
  ADD CONSTRAINT app_tasks_time_zone_not_blank CHECK (
    time_zone IS NULL OR length(btrim(time_zone)) > 0
  ),
  ADD CONSTRAINT app_tasks_location_not_blank CHECK (
    location IS NULL OR length(btrim(location)) > 0
  );

CREATE INDEX app_tasks_owner_scheduled_start_idx
  ON app.tasks (owner_userId, scheduled_start_at)
  WHERE scheduled_start_at IS NOT NULL AND status IN ('pending', 'in_progress');

CREATE INDEX app_tasks_owner_scheduling_window_idx
  ON app.tasks (owner_userId, scheduling_window_start_at, scheduling_window_end_at)
  WHERE scheduled_start_at IS NULL AND duration_minutes IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS app_tasks_owner_scheduling_window_idx;
DROP INDEX IF EXISTS app_tasks_owner_scheduled_start_idx;

ALTER TABLE app.tasks
  DROP CONSTRAINT IF EXISTS app_tasks_location_not_blank,
  DROP CONSTRAINT IF EXISTS app_tasks_time_zone_not_blank,
  DROP CONSTRAINT IF EXISTS app_tasks_scheduled_interval_check,
  DROP CONSTRAINT IF EXISTS app_tasks_scheduling_window_check,
  DROP CONSTRAINT IF EXISTS app_tasks_duration_positive_check,
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS time_zone,
  DROP COLUMN IF EXISTS scheduled_end_at,
  DROP COLUMN IF EXISTS scheduled_start_at,
  DROP COLUMN IF EXISTS scheduling_window_end_at,
  DROP COLUMN IF EXISTS scheduling_window_start_at,
  DROP COLUMN IF EXISTS duration_minutes;

-- +goose StatementEnd
