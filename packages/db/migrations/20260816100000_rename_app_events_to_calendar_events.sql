-- +goose Up
-- +goose StatementBegin

ALTER TABLE IF EXISTS app.events RENAME TO calendar_events;

ALTER INDEX IF EXISTS app.app_events_owner_starts_idx
  RENAME TO app_calendar_events_owner_starts_idx;
ALTER INDEX IF EXISTS app.app_events_trip_idx
  RENAME TO app_calendar_events_trip_idx;
ALTER INDEX IF EXISTS app.app_events_calendar_idx
  RENAME TO app_calendar_events_calendar_idx;
ALTER INDEX IF EXISTS app.app_events_source_row_id_idx
  RENAME TO app_calendar_events_source_row_id_idx;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_pkey') THEN
    ALTER TABLE app.calendar_events
      RENAME CONSTRAINT events_pkey TO calendar_events_pkey;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'app.calendar_events'::regclass
      AND tgname = 'app_events_set_updated_at'
  ) THEN
    ALTER TRIGGER app_events_set_updated_at ON app.calendar_events
      RENAME TO app_calendar_events_set_updated_at;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'app.calendar_events'::regclass
      AND tgname = 'app_events_sync_entity_registry'
  ) THEN
    ALTER TRIGGER app_events_sync_entity_registry ON app.calendar_events
      RENAME TO app_calendar_events_sync_entity_registry;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polrelid = 'app.calendar_events'::regclass
      AND polname = 'app_events_owner_policy'
  ) THEN
    ALTER POLICY app_events_owner_policy ON app.calendar_events
      RENAME TO app_calendar_events_owner_policy;
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
    WHERE polrelid = 'app.calendar_events'::regclass
      AND polname = 'app_calendar_events_owner_policy'
  ) THEN
    ALTER POLICY app_calendar_events_owner_policy ON app.calendar_events
      RENAME TO app_events_owner_policy;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'app.calendar_events'::regclass
      AND tgname = 'app_calendar_events_set_updated_at'
  ) THEN
    ALTER TRIGGER app_calendar_events_set_updated_at ON app.calendar_events
      RENAME TO app_events_set_updated_at;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'app.calendar_events'::regclass
      AND tgname = 'app_calendar_events_sync_entity_registry'
  ) THEN
    ALTER TRIGGER app_calendar_events_sync_entity_registry ON app.calendar_events
      RENAME TO app_events_sync_entity_registry;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'calendar_events_pkey') THEN
    ALTER TABLE app.calendar_events
      RENAME CONSTRAINT calendar_events_pkey TO events_pkey;
  END IF;
END;
$$;

ALTER INDEX IF EXISTS app.app_calendar_events_source_row_id_idx
  RENAME TO app_events_source_row_id_idx;
ALTER INDEX IF EXISTS app.app_calendar_events_calendar_idx
  RENAME TO app_events_calendar_idx;
ALTER INDEX IF EXISTS app.app_calendar_events_trip_idx
  RENAME TO app_events_trip_idx;
ALTER INDEX IF EXISTS app.app_calendar_events_owner_starts_idx
  RENAME TO app_events_owner_starts_idx;

ALTER TABLE IF EXISTS app.calendar_events RENAME TO events;

-- +goose StatementEnd
