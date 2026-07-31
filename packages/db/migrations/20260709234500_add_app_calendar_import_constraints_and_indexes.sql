-- +goose Up
-- +goose StatementBegin

ALTER TABLE app.calendar_event_sources
  ADD CONSTRAINT app_calendar_event_sources_calendar_uid_not_blank CHECK (
    length(btrim(calendar_uid)) > 0
  );

ALTER TABLE app.event_occurrences
  ADD CONSTRAINT app_event_occurrences_time_order_check CHECK (
    ends_at IS NULL OR ends_at >= starts_at
  ),
  ADD CONSTRAINT app_event_occurrences_all_day_date_check CHECK (
    NOT is_all_day OR occurrence_date IS NOT NULL
  ),
  ADD CONSTRAINT app_event_occurrences_status_check CHECK (
    status IN ('confirmed', 'cancelled')
  );

CREATE UNIQUE INDEX app_calendar_event_sources_source_uid_key
  ON app.calendar_event_sources (source_id, calendar_uid);

CREATE INDEX app_calendar_event_sources_event_id_idx
  ON app.calendar_event_sources (event_id);

CREATE UNIQUE INDEX app_event_occurrences_event_key
  ON app.event_occurrences (event_id, occurrence_key);

CREATE INDEX app_event_occurrences_event_starts_at_idx
  ON app.event_occurrences (event_id, starts_at);

CREATE INDEX app_event_occurrences_starts_at_idx
  ON app.event_occurrences (starts_at)
  WHERE status = 'confirmed';

CREATE TRIGGER app_calendar_event_sources_set_updated_at
  BEFORE UPDATE ON app.calendar_event_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_event_occurrences_set_updated_at
  BEFORE UPDATE ON app.event_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TRIGGER IF EXISTS app_event_occurrences_set_updated_at ON app.event_occurrences;
DROP TRIGGER IF EXISTS app_calendar_event_sources_set_updated_at ON app.calendar_event_sources;

DROP INDEX IF EXISTS app.app_event_occurrences_starts_at_idx;
DROP INDEX IF EXISTS app.app_event_occurrences_event_starts_at_idx;
DROP INDEX IF EXISTS app.app_event_occurrences_event_key;
DROP INDEX IF EXISTS app.app_calendar_event_sources_event_id_idx;
DROP INDEX IF EXISTS app.app_calendar_event_sources_source_uid_key;

ALTER TABLE app.event_occurrences
  DROP CONSTRAINT IF EXISTS app_event_occurrences_status_check,
  DROP CONSTRAINT IF EXISTS app_event_occurrences_all_day_date_check,
  DROP CONSTRAINT IF EXISTS app_event_occurrences_time_order_check;

ALTER TABLE app.calendar_event_sources
  DROP CONSTRAINT IF EXISTS app_calendar_event_sources_calendar_uid_not_blank;

-- +goose StatementEnd
