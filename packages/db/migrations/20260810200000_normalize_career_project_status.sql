-- +goose Up

CREATE TYPE app.career_project_status AS ENUM (
  'BACKLOG',
  'IN_PROGRESS',
  'DONE',
  'CANCELED'
);

ALTER TABLE app.career_positions
  ALTER COLUMN project_status TYPE app.career_project_status
  USING CASE lower(regexp_replace(btrim(project_status), '[[:space:]-]+', '_', 'g'))
    WHEN 'backlog' THEN 'BACKLOG'::app.career_project_status
    WHEN 'in_progress' THEN 'IN_PROGRESS'::app.career_project_status
    WHEN 'done' THEN 'DONE'::app.career_project_status
    WHEN 'canceled' THEN 'CANCELED'::app.career_project_status
    WHEN 'cancelled' THEN 'CANCELED'::app.career_project_status
    ELSE NULL
  END;

-- +goose Down

ALTER TABLE app.career_positions
  ALTER COLUMN project_status TYPE TEXT
  USING project_status::text;

DROP TYPE app.career_project_status;
