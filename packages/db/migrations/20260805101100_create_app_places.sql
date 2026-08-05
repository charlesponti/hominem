-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.places (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) > 0),
  place_type text,
  formatted_address text,
  city text,
  state text,
  postal_code text,
  country text,
  country_code text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  url text,
  geocoded_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_row_id integer,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_places_owner_userId_idx ON app.places(owner_userId);
CREATE INDEX app_places_source_row_id_idx ON app.places(source_row_id) WHERE source_row_id IS NOT NULL;

CREATE TABLE app.place_visits (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  place_id uuid REFERENCES app.places(id) ON DELETE SET NULL,
  visited_at timestamptz,
  purpose text,
  notes text,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_place_visits_place_id_idx ON app.place_visits(place_id);
CREATE INDEX app_place_visits_owner_userId_idx ON app.place_visits(owner_userId);

CREATE TRIGGER app_places_set_updated_at
  BEFORE UPDATE ON app.places
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE app.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.places FORCE ROW LEVEL SECURITY;
ALTER TABLE app.place_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.place_visits FORCE ROW LEVEL SECURITY;

CREATE POLICY app_places_owner_policy ON app.places
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_place_visits_owner_policy ON app.place_visits
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS app.place_visits;
DROP TABLE IF EXISTS app.places;

-- +goose StatementEnd
