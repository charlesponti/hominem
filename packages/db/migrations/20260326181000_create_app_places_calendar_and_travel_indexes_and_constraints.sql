-- +goose Up
ALTER TABLE app.places
  ADD CONSTRAINT app_places_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_places_latitude_range_check CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  ADD CONSTRAINT app_places_longitude_range_check CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  ADD CONSTRAINT app_places_coordinates_pair_check CHECK (
    (latitude IS NULL AND longitude IS NULL) OR
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  ),
  ADD CONSTRAINT app_places_rating_range_check CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  ADD CONSTRAINT app_places_source_not_blank CHECK (source IS NULL OR length(btrim(source)) > 0),
  ADD CONSTRAINT app_places_external_id_not_blank CHECK (external_id IS NULL OR length(btrim(external_id)) > 0);

ALTER TABLE app.bookmarks
  ADD CONSTRAINT app_bookmarks_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_bookmarks_url_not_blank CHECK (length(btrim(url)) > 0);

ALTER TABLE app.events
  ADD CONSTRAINT app_events_event_type_not_blank CHECK (length(btrim(event_type)) > 0),
  ADD CONSTRAINT app_events_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_events_time_order_check CHECK (ends_at IS NULL OR ends_at >= starts_at),
  ADD CONSTRAINT app_events_source_not_blank CHECK (source IS NULL OR length(btrim(source)) > 0),
  ADD CONSTRAINT app_events_external_id_not_blank CHECK (external_id IS NULL OR length(btrim(external_id)) > 0);

ALTER TABLE app.event_attendees
  ADD CONSTRAINT app_event_attendees_contact_check CHECK (person_id IS NOT NULL OR email IS NOT NULL),
  ADD CONSTRAINT app_event_attendees_email_not_blank CHECK (email IS NULL OR length(btrim(email)) > 0),
  ADD CONSTRAINT app_event_attendees_status_check CHECK (status IN ('needs_action', 'accepted', 'declined', 'tentative')),
  ADD CONSTRAINT app_event_attendees_role_check CHECK (role IN ('required', 'optional', 'organizer'));

ALTER TABLE app.travel_trips
  ADD CONSTRAINT app_travel_trips_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_travel_trips_status_check CHECK (status IN ('planned', 'booked', 'in_progress', 'completed', 'cancelled')),
  ADD CONSTRAINT app_travel_trips_date_order_check CHECK (end_date IS NULL OR end_date >= start_date);

CREATE INDEX app_places_owner_userId_idx
  ON app.places (owner_userId, updatedAt DESC);

CREATE INDEX app_places_search_idx
  ON app.places USING gin (search_vector);

CREATE INDEX app_places_external_id_idx
  ON app.places (owner_userId, source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX app_bookmarks_owner_userId_idx
  ON app.bookmarks (owner_userId, createdAt DESC);

CREATE INDEX app_bookmarks_place_id_idx
  ON app.bookmarks (place_id);

CREATE INDEX app_bookmarks_search_idx
  ON app.bookmarks USING gin (search_vector);

CREATE INDEX app_events_owner_starts_at_idx
  ON app.events (owner_userId, starts_at);

CREATE INDEX app_events_owner_type_idx
  ON app.events (owner_userId, event_type);

CREATE INDEX app_events_place_id_idx
  ON app.events (place_id);

CREATE INDEX app_events_search_idx
  ON app.events USING gin (search_vector);

CREATE INDEX app_events_external_id_idx
  ON app.events (owner_userId, source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

CREATE INDEX app_event_attendees_event_id_idx
  ON app.event_attendees (event_id);

CREATE INDEX app_event_attendees_person_id_idx
  ON app.event_attendees (person_id)
  WHERE person_id IS NOT NULL;

CREATE INDEX app_event_attendees_email_idx
  ON app.event_attendees (lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX app_event_attendees_event_person_key
  ON app.event_attendees (event_id, person_id)
  WHERE person_id IS NOT NULL;

CREATE UNIQUE INDEX app_event_attendees_event_email_key
  ON app.event_attendees (event_id, lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX app_travel_trips_owner_start_date_idx
  ON app.travel_trips (owner_userId, start_date);

CREATE INDEX app_travel_trips_owner_status_idx
  ON app.travel_trips (owner_userId, status);

CREATE TRIGGER app_places_set_updated_at
  BEFORE UPDATE ON app.places
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_bookmarks_set_updated_at
  BEFORE UPDATE ON app.bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_events_set_updated_at
  BEFORE UPDATE ON app.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_event_attendees_set_updated_at
  BEFORE UPDATE ON app.event_attendees
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_travel_trips_set_updated_at
  BEFORE UPDATE ON app.travel_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- +goose Down
DROP TRIGGER IF EXISTS app_travel_trips_set_updated_at ON app.travel_trips;
DROP TRIGGER IF EXISTS app_event_attendees_set_updated_at ON app.event_attendees;
DROP TRIGGER IF EXISTS app_events_set_updated_at ON app.events;
DROP TRIGGER IF EXISTS app_bookmarks_set_updated_at ON app.bookmarks;
DROP TRIGGER IF EXISTS app_places_set_updated_at ON app.places;

DROP INDEX IF EXISTS app_travel_trips_owner_status_idx;
DROP INDEX IF EXISTS app_travel_trips_owner_start_date_idx;
DROP INDEX IF EXISTS app_event_attendees_event_email_key;
DROP INDEX IF EXISTS app_event_attendees_event_person_key;
DROP INDEX IF EXISTS app_event_attendees_email_idx;
DROP INDEX IF EXISTS app_event_attendees_person_id_idx;
DROP INDEX IF EXISTS app_event_attendees_event_id_idx;
DROP INDEX IF EXISTS app_events_external_id_idx;
DROP INDEX IF EXISTS app_events_search_idx;
DROP INDEX IF EXISTS app_events_place_id_idx;
DROP INDEX IF EXISTS app_events_owner_type_idx;
DROP INDEX IF EXISTS app_events_owner_starts_at_idx;
DROP INDEX IF EXISTS app_bookmarks_search_idx;
DROP INDEX IF EXISTS app_bookmarks_place_id_idx;
DROP INDEX IF EXISTS app_bookmarks_owner_userId_idx;
DROP INDEX IF EXISTS app_places_external_id_idx;
DROP INDEX IF EXISTS app_places_search_idx;
DROP INDEX IF EXISTS app_places_owner_userId_idx;

ALTER TABLE app.travel_trips
  DROP CONSTRAINT IF EXISTS app_travel_trips_date_order_check,
  DROP CONSTRAINT IF EXISTS app_travel_trips_status_check,
  DROP CONSTRAINT IF EXISTS app_travel_trips_name_not_blank;

ALTER TABLE app.event_attendees
  DROP CONSTRAINT IF EXISTS app_event_attendees_role_check,
  DROP CONSTRAINT IF EXISTS app_event_attendees_status_check,
  DROP CONSTRAINT IF EXISTS app_event_attendees_email_not_blank,
  DROP CONSTRAINT IF EXISTS app_event_attendees_contact_check;

ALTER TABLE app.events
  DROP CONSTRAINT IF EXISTS app_events_external_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_events_source_not_blank,
  DROP CONSTRAINT IF EXISTS app_events_time_order_check,
  DROP CONSTRAINT IF EXISTS app_events_title_not_blank,
  DROP CONSTRAINT IF EXISTS app_events_event_type_not_blank;

ALTER TABLE app.bookmarks
  DROP CONSTRAINT IF EXISTS app_bookmarks_url_not_blank,
  DROP CONSTRAINT IF EXISTS app_bookmarks_title_not_blank;

ALTER TABLE app.places
  DROP CONSTRAINT IF EXISTS app_places_external_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_places_source_not_blank,
  DROP CONSTRAINT IF EXISTS app_places_rating_range_check,
  DROP CONSTRAINT IF EXISTS app_places_coordinates_pair_check,
  DROP CONSTRAINT IF EXISTS app_places_longitude_range_check,
  DROP CONSTRAINT IF EXISTS app_places_latitude_range_check,
  DROP CONSTRAINT IF EXISTS app_places_name_not_blank;
