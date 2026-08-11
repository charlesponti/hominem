-- +goose Up

ALTER TABLE app.career_positions
  RENAME COLUMN project_status TO status;

-- +goose Down

ALTER TABLE app.career_positions
  RENAME COLUMN status TO project_status;
