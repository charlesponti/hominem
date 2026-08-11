-- +goose Up

-- app.career_applications is a warehouse/import boundary, so status is stored
-- as text. Normalize legacy source values before the application code treats
-- the column as JobApplicationStatus. NULL remains a valid "no status" value.
UPDATE app.career_applications
SET status = CASE upper(btrim(status))
  WHEN 'ACTIVE' THEN 'APPLIED'
  WHEN 'APPLIED' THEN 'APPLIED'
  WHEN 'PHONE_SCREEN' THEN 'PHONE_SCREEN'
  WHEN 'PHONE SCREEN' THEN 'PHONE_SCREEN'
  WHEN 'INTERVIEW' THEN 'INTERVIEW'
  WHEN 'INTERVIEWING' THEN 'INTERVIEW'
  WHEN 'FINAL_INTERVIEW' THEN 'FINAL_INTERVIEW'
  WHEN 'FINAL INTERVIEW' THEN 'FINAL_INTERVIEW'
  WHEN 'OFFER' THEN 'OFFER'
  WHEN 'ACCEPTED' THEN 'ACCEPTED'
  WHEN 'REJECTED' THEN 'REJECTED'
  WHEN 'WITHDREW' THEN 'WITHDRAWN'
  WHEN 'WITHDRAWN' THEN 'WITHDRAWN'
  ELSE status
END
WHERE status IS NOT NULL;

-- +goose StatementBegin
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app.career_applications
    WHERE status IS NOT NULL
      AND status NOT IN (
        'APPLIED',
        'PHONE_SCREEN',
        'INTERVIEW',
        'FINAL_INTERVIEW',
        'OFFER',
        'ACCEPTED',
        'REJECTED',
        'WITHDRAWN'
      )
  ) THEN
    RAISE EXCEPTION 'Unmapped career application status remains after normalization';
  END IF;
END
$migration$;
-- +goose StatementEnd

-- +goose Down

-- The normalization is intentionally not reversed: several legacy values map
-- to one canonical value, so a lossless rollback is not possible.
SELECT 1;
