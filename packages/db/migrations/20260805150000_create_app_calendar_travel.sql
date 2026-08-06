-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.calendars (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_userId, name)
);
CREATE INDEX app_calendars_owner_userId_idx ON app.calendars(owner_userId);

CREATE TABLE app.travel_trips (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text,
  city text,
  state text,
  country text,
  start_date date,
  end_date date,
  price numeric(12,2),
  notes text,
  source_row_id integer,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_travel_trips_owner_userId_idx ON app.travel_trips(owner_userId);
CREATE INDEX app_travel_trips_source_row_id_idx ON app.travel_trips(source_row_id) WHERE source_row_id IS NOT NULL;

CREATE TABLE app.travel_trip_attendees (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  trip_id uuid NOT NULL REFERENCES app.travel_trips(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  role text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, person_id, role)
);
CREATE INDEX app_travel_trip_attendees_trip_id_idx ON app.travel_trip_attendees(trip_id);
CREATE INDEX app_travel_trip_attendees_person_id_idx ON app.travel_trip_attendees(person_id);

CREATE TABLE app.travel_segments (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES app.travel_trips(id) ON DELETE CASCADE,
  segment_type text NOT NULL CHECK (segment_type IN ('flight', 'rail', 'road', 'lodging', 'other')),
  provider text,
  confirmation_code text,
  origin_code text,
  destination_code text,
  origin_place_id uuid REFERENCES app.places(id) ON DELETE SET NULL,
  destination_place_id uuid REFERENCES app.places(id) ON DELETE SET NULL,
  departs_at timestamptz,
  arrives_at timestamptz,
  cost numeric(12,2),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  CHECK (arrives_at IS NULL OR departs_at IS NULL OR arrives_at >= departs_at)
);
CREATE INDEX app_travel_segments_owner_userId_idx ON app.travel_segments(owner_userId);
CREATE INDEX app_travel_segments_trip_id_idx ON app.travel_segments(trip_id);

CREATE TABLE app.events (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  calendar_id uuid REFERENCES app.calendars(id) ON DELETE SET NULL,
  place_id uuid REFERENCES app.places(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES app.travel_trips(id) ON DELETE SET NULL,
  event_type text,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  is_all_day boolean NOT NULL DEFAULT false,
  status text,
  organizer text,
  recurrence_rule text,
  external_uid text,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_row_id text,   -- warehouse calendar_events.id is a mix of small ints and UUIDs
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_events_owner_starts_idx ON app.events(owner_userId, starts_at DESC);
CREATE INDEX app_events_trip_idx ON app.events(trip_id) WHERE trip_id IS NOT NULL;
CREATE INDEX app_events_calendar_idx ON app.events(calendar_id) WHERE calendar_id IS NOT NULL;
CREATE INDEX app_events_source_row_id_idx ON app.events(source_row_id) WHERE source_row_id IS NOT NULL;

CREATE TABLE app.event_attendees (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  event_id uuid NOT NULL REFERENCES app.events(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'participant',
  source text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, person_id)
);
CREATE INDEX app_event_attendees_event_id_idx ON app.event_attendees(event_id);
CREATE INDEX app_event_attendees_person_id_idx ON app.event_attendees(person_id) WHERE person_id IS NOT NULL;

CREATE TRIGGER app_travel_trips_set_updated_at
  BEFORE UPDATE ON app.travel_trips
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_travel_segments_set_updated_at
  BEFORE UPDATE ON app.travel_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_events_set_updated_at
  BEFORE UPDATE ON app.events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE app.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.calendars FORCE ROW LEVEL SECURITY;
ALTER TABLE app.travel_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.travel_trips FORCE ROW LEVEL SECURITY;
ALTER TABLE app.travel_trip_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.travel_trip_attendees FORCE ROW LEVEL SECURITY;
ALTER TABLE app.travel_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.travel_segments FORCE ROW LEVEL SECURITY;
ALTER TABLE app.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.events FORCE ROW LEVEL SECURITY;
ALTER TABLE app.event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.event_attendees FORCE ROW LEVEL SECURITY;

CREATE POLICY app_calendars_owner_policy ON app.calendars
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_travel_trips_owner_policy ON app.travel_trips
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_travel_trip_attendees_owner_policy ON app.travel_trip_attendees
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1 FROM app.travel_trips t
      WHERE t.id = travel_trip_attendees.trip_id AND t.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1 FROM app.travel_trips t
      WHERE t.id = travel_trip_attendees.trip_id AND t.owner_userId = auth.current_user_id()
    )
  );

CREATE POLICY app_travel_segments_owner_policy ON app.travel_segments
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_events_owner_policy ON app.events
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_event_attendees_owner_policy ON app.event_attendees
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1 FROM app.events e
      WHERE e.id = event_attendees.event_id AND e.owner_userId = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1 FROM app.events e
      WHERE e.id = event_attendees.event_id AND e.owner_userId = auth.current_user_id()
    )
  );

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS app.event_attendees;
DROP TABLE IF EXISTS app.events;
DROP TABLE IF EXISTS app.travel_segments;
DROP TABLE IF EXISTS app.travel_trip_attendees;
DROP TABLE IF EXISTS app.travel_trips;
DROP TABLE IF EXISTS app.calendars;

-- +goose StatementEnd
