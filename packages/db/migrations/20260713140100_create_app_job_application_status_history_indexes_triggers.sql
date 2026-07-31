-- +goose Up
-- +goose StatementBegin
ALTER TABLE app.job_application_status_history
  ADD CONSTRAINT app_job_application_status_history_new_status_check CHECK (
    new_status IN (
      'APPLIED',
      'PHONE_SCREEN',
      'INTERVIEW',
      'FINAL_INTERVIEW',
      'OFFER',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN'
    )
  ),
  ADD CONSTRAINT app_job_application_status_history_previous_status_check CHECK (
    previous_status IS NULL
    OR previous_status IN (
      'APPLIED',
      'PHONE_SCREEN',
      'INTERVIEW',
      'FINAL_INTERVIEW',
      'OFFER',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN'
    )
  );

CREATE INDEX app_job_application_status_history_application_id_idx
  ON app.job_application_status_history (application_id);

CREATE INDEX app_job_application_status_history_application_changed_idx
  ON app.job_application_status_history (application_id, changed_at);

CREATE OR REPLACE FUNCTION app.log_job_application_status_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO app.job_application_status_history (application_id, previous_status, new_status, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_job_applications_log_status_change
  AFTER UPDATE ON app.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION app.log_job_application_status_change();
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TRIGGER IF EXISTS app_job_applications_log_status_change ON app.job_applications;
DROP FUNCTION IF EXISTS app.log_job_application_status_change();

DROP INDEX IF EXISTS app.app_job_application_status_history_application_changed_idx;
DROP INDEX IF EXISTS app.app_job_application_status_history_application_id_idx;

ALTER TABLE app.job_application_status_history
  DROP CONSTRAINT IF EXISTS app_job_application_status_history_previous_status_check,
  DROP CONSTRAINT IF EXISTS app_job_application_status_history_new_status_check;
-- +goose StatementEnd
