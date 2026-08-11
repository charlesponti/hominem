-- +goose Up

CREATE TYPE app.career_application_status AS ENUM (
  'WISHLIST',
  'APPLIED',
  'SCREENING',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN'
);

CREATE TYPE app.career_application_stage_kind AS ENUM (
  'APPLICATION',
  'SCREEN',
  'OFFER',
  'OUTCOME'
);

ALTER TABLE app.career_application_stages
  ADD COLUMN stage_kind app.career_application_stage_kind;

ALTER TABLE app.career_applications
  ADD COLUMN current_stage_id UUID REFERENCES app.career_application_stages(id) ON DELETE SET NULL;

UPDATE app.career_applications
SET status = CASE upper(btrim(status))
  WHEN 'WISHLIST' THEN 'WISHLIST'
  WHEN 'ACTIVE' THEN 'APPLIED'
  WHEN 'APPLIED' THEN 'APPLIED'
  WHEN 'PHONE_SCREEN' THEN 'SCREENING'
  WHEN 'PHONE SCREEN' THEN 'SCREENING'
  WHEN 'INTERVIEW' THEN 'SCREENING'
  WHEN 'INTERVIEWING' THEN 'SCREENING'
  WHEN 'FINAL_INTERVIEW' THEN 'SCREENING'
  WHEN 'FINAL INTERVIEW' THEN 'SCREENING'
  WHEN 'OFFER' THEN 'OFFER'
  WHEN 'ACCEPTED' THEN 'ACCEPTED'
  WHEN 'REJECTED' THEN 'REJECTED'
  WHEN 'WITHDREW' THEN 'WITHDRAWN'
  WHEN 'WITHDRAWN' THEN 'WITHDRAWN'
  ELSE status
END
WHERE status IS NOT NULL;

UPDATE app.career_application_stages
SET stage_kind = CASE lower(regexp_replace(btrim(stage), '[^a-zA-Z0-9]+', '_', 'g'))
  WHEN 'applied' THEN 'APPLICATION'
  WHEN 'application' THEN 'APPLICATION'
  WHEN 'offer' THEN 'OFFER'
  WHEN 'accepted' THEN 'OUTCOME'
  WHEN 'rejected' THEN 'OUTCOME'
  WHEN 'withdrew' THEN 'OUTCOME'
  WHEN 'withdrawn' THEN 'OUTCOME'
  ELSE 'SCREEN'
END::app.career_application_stage_kind;

-- Preserve a legacy active-stage value that has no corresponding stage-history row.
INSERT INTO app.career_application_stages (application_id, stage, stage_kind)
SELECT application.id,
  application.current_stage,
  CASE lower(regexp_replace(btrim(application.current_stage), '[^a-zA-Z0-9]+', '_', 'g'))
    WHEN 'applied' THEN 'APPLICATION'::app.career_application_stage_kind
    WHEN 'application' THEN 'APPLICATION'::app.career_application_stage_kind
    WHEN 'offer' THEN 'OFFER'::app.career_application_stage_kind
    ELSE 'SCREEN'::app.career_application_stage_kind
  END
FROM app.career_applications AS application
WHERE application.current_stage IS NOT NULL
  AND lower(regexp_replace(btrim(application.current_stage), '[^a-zA-Z0-9]+', '_', 'g'))
    NOT IN ('accepted', 'rejected', 'withdrew', 'withdrawn')
  AND NOT EXISTS (
    SELECT 1
    FROM app.career_application_stages AS stage
    WHERE stage.application_id = application.id
      AND lower(regexp_replace(btrim(stage.stage), '[^a-zA-Z0-9]+', '_', 'g'))
        = lower(regexp_replace(btrim(application.current_stage), '[^a-zA-Z0-9]+', '_', 'g'))
  );

UPDATE app.career_applications AS application
SET current_stage_id = match.stage_id
FROM (
  SELECT legacy_application.id AS application_id,
    (
      SELECT stage.id
      FROM app.career_application_stages AS stage
      WHERE stage.application_id = legacy_application.id
        AND lower(regexp_replace(btrim(stage.stage), '[^a-zA-Z0-9]+', '_', 'g'))
          = lower(regexp_replace(btrim(legacy_application.current_stage), '[^a-zA-Z0-9]+', '_', 'g'))
      ORDER BY stage.entered_at DESC NULLS LAST, stage.created_at DESC, stage.id DESC
      LIMIT 1
    ) AS stage_id
  FROM app.career_applications AS legacy_application
  WHERE legacy_application.current_stage IS NOT NULL
    AND lower(regexp_replace(btrim(legacy_application.current_stage), '[^a-zA-Z0-9]+', '_', 'g'))
      NOT IN ('accepted', 'rejected', 'withdrew', 'withdrawn')
) AS match
WHERE application.id = match.application_id;

UPDATE app.career_applications AS application
SET status = CASE stage.stage_kind
  WHEN 'APPLICATION' THEN 'APPLIED'
  WHEN 'SCREEN' THEN 'SCREENING'
  WHEN 'OFFER' THEN 'OFFER'
  ELSE application.status
END
FROM app.career_application_stages AS stage
WHERE stage.id = application.current_stage_id;

-- +goose StatementBegin
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app.career_applications
    WHERE current_stage IS NOT NULL
      AND lower(regexp_replace(btrim(current_stage), '[^a-zA-Z0-9]+', '_', 'g'))
        NOT IN ('accepted', 'rejected', 'withdrew', 'withdrawn')
      AND current_stage_id IS NULL
  ) THEN
    RAISE EXCEPTION 'A legacy current stage could not be linked to stage history';
  END IF;
END
$migration$;
-- +goose StatementEnd

ALTER TABLE app.career_application_stages
  ALTER COLUMN stage_kind SET NOT NULL;

ALTER TABLE app.career_applications
  DROP COLUMN current_stage,
  ALTER COLUMN status TYPE app.career_application_status USING status::app.career_application_status,
  ALTER COLUMN status SET NOT NULL;

-- +goose StatementBegin
CREATE FUNCTION app.validate_career_application_pipeline(application_row app.career_applications)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
DECLARE
  active_stage_kind app.career_application_stage_kind;
  expected_status app.career_application_status;
BEGIN
  IF application_row.current_stage_id IS NULL THEN
    IF application_row.status NOT IN ('WISHLIST', 'ACCEPTED', 'REJECTED', 'WITHDRAWN') THEN
      RAISE EXCEPTION 'Career application status % requires an active stage', application_row.status;
    END IF;
    RETURN;
  END IF;

  SELECT stage_kind
  INTO active_stage_kind
  FROM app.career_application_stages
  WHERE id = application_row.current_stage_id
    AND application_id = application_row.id;

  IF active_stage_kind IS NULL THEN
    RAISE EXCEPTION 'Career application current_stage_id must belong to the application';
  END IF;

  expected_status = CASE active_stage_kind
    WHEN 'APPLICATION' THEN 'APPLIED'::app.career_application_status
    WHEN 'SCREEN' THEN 'SCREENING'::app.career_application_status
    WHEN 'OFFER' THEN 'OFFER'::app.career_application_status
    WHEN 'OUTCOME' THEN NULL
  END;

  IF expected_status IS NULL OR application_row.status <> expected_status THEN
    RAISE EXCEPTION 'Career application status % does not match active stage kind %',
      application_row.status, active_stage_kind;
  END IF;
END;
$function$;

CREATE FUNCTION app.enforce_career_application_pipeline()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  PERFORM app.validate_career_application_pipeline(NEW);
  RETURN NULL;
END;
$function$;

CREATE FUNCTION app.enforce_active_career_application_stage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
DECLARE
  application app.career_applications;
BEGIN
  SELECT * INTO application
  FROM app.career_applications
  WHERE current_stage_id = NEW.id;

  IF FOUND THEN
    PERFORM app.validate_career_application_pipeline(application);
  END IF;

  RETURN NULL;
END;
$function$;

CREATE CONSTRAINT TRIGGER career_application_pipeline_matches_status
  AFTER INSERT OR UPDATE OF status, current_stage_id ON app.career_applications
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION app.enforce_career_application_pipeline();

CREATE CONSTRAINT TRIGGER active_career_application_stage_matches_status
  AFTER UPDATE OF stage_kind, application_id ON app.career_application_stages
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION app.enforce_active_career_application_stage();
-- +goose StatementEnd

CREATE INDEX idx_career_apps_current_stage ON app.career_applications(current_stage_id);
CREATE INDEX idx_career_stages_kind ON app.career_application_stages(stage_kind);

-- +goose Down

ALTER TABLE app.career_applications
  ADD COLUMN current_stage TEXT;

UPDATE app.career_applications AS application
SET current_stage = stage.stage
FROM app.career_application_stages AS stage
WHERE stage.id = application.current_stage_id;

DROP INDEX app.idx_career_stages_kind;
DROP INDEX app.idx_career_apps_current_stage;

DROP TRIGGER active_career_application_stage_matches_status ON app.career_application_stages;
DROP TRIGGER career_application_pipeline_matches_status ON app.career_applications;
DROP FUNCTION app.enforce_active_career_application_stage();
DROP FUNCTION app.enforce_career_application_pipeline();
DROP FUNCTION app.validate_career_application_pipeline(app.career_applications);

ALTER TABLE app.career_applications
  DROP COLUMN current_stage_id,
  ALTER COLUMN status TYPE TEXT USING status::TEXT;

ALTER TABLE app.career_application_stages
  DROP COLUMN stage_kind;

DROP TYPE app.career_application_stage_kind;
DROP TYPE app.career_application_status;
