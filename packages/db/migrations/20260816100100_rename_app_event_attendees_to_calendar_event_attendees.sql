-- +goose Up
-- +goose StatementBegin

ALTER TABLE IF EXISTS app.event_attendees RENAME TO calendar_event_attendees;

ALTER INDEX IF EXISTS app.app_event_attendees_event_id_idx
  RENAME TO app_calendar_event_attendees_event_id_idx;
ALTER INDEX IF EXISTS app.app_event_attendees_person_id_idx
  RENAME TO app_calendar_event_attendees_person_id_idx;
ALTER INDEX IF EXISTS app.app_event_attendees_email_idx
  RENAME TO app_calendar_event_attendees_email_idx;
ALTER INDEX IF EXISTS app.app_event_attendees_event_person_key
  RENAME TO app_calendar_event_attendees_event_person_key;
ALTER INDEX IF EXISTS app.app_event_attendees_event_email_key
  RENAME TO app_calendar_event_attendees_event_email_key;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_attendees_pkey') THEN
    ALTER TABLE app.calendar_event_attendees
      RENAME CONSTRAINT event_attendees_pkey TO calendar_event_attendees_pkey;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'app.calendar_event_attendees'::regclass
      AND tgname = 'app_event_attendees_set_updated_at'
  ) THEN
    ALTER TRIGGER app_event_attendees_set_updated_at ON app.calendar_event_attendees
      RENAME TO app_calendar_event_attendees_set_updated_at;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'app.calendar_event_attendees'::regclass
      AND polname = 'app_event_attendees_owner_policy'
  ) THEN
    ALTER POLICY app_event_attendees_owner_policy ON app.calendar_event_attendees
      RENAME TO app_calendar_event_attendees_owner_policy;
  END IF;
END;
$$;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'app.calendar_event_attendees'::regclass
      AND polname = 'app_calendar_event_attendees_owner_policy'
  ) THEN
    ALTER POLICY app_calendar_event_attendees_owner_policy ON app.calendar_event_attendees
      RENAME TO app_event_attendees_owner_policy;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'app.calendar_event_attendees'::regclass
      AND tgname = 'app_calendar_event_attendees_set_updated_at'
  ) THEN
    ALTER TRIGGER app_calendar_event_attendees_set_updated_at ON app.calendar_event_attendees
      RENAME TO app_event_attendees_set_updated_at;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_event_attendees_pkey') THEN
    ALTER TABLE app.calendar_event_attendees
      RENAME CONSTRAINT calendar_event_attendees_pkey TO event_attendees_pkey;
  END IF;
END;
$$;

ALTER INDEX IF EXISTS app.app_calendar_event_attendees_event_email_key
  RENAME TO app_event_attendees_event_email_key;
ALTER INDEX IF EXISTS app.app_calendar_event_attendees_event_person_key
  RENAME TO app_event_attendees_event_person_key;
ALTER INDEX IF EXISTS app.app_calendar_event_attendees_email_idx
  RENAME TO app_event_attendees_email_idx;
ALTER INDEX IF EXISTS app.app_calendar_event_attendees_person_id_idx
  RENAME TO app_event_attendees_person_id_idx;
ALTER INDEX IF EXISTS app.app_calendar_event_attendees_event_id_idx
  RENAME TO app_event_attendees_event_id_idx;

ALTER TABLE IF EXISTS app.calendar_event_attendees RENAME TO event_attendees;

-- +goose StatementEnd
