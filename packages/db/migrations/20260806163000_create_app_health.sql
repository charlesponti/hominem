-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.health_observations (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  observed_at timestamptz NOT NULL,
  observation_type text NOT NULL CHECK (length(btrim(observation_type)) > 0),
  value numeric,
  unit text,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_health_observations_owner_type_time
  ON app.health_observations(owner_userId, observation_type, observed_at DESC);
CREATE INDEX idx_app_health_observations_person
  ON app.health_observations(person_id) WHERE person_id IS NOT NULL;

CREATE TABLE app.health_activities (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (length(btrim(activity_type)) > 0),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  source text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR ends_at >= starts_at)
);
CREATE INDEX idx_app_health_activities_owner_type_time
  ON app.health_activities(owner_userId, activity_type, starts_at DESC);
CREATE INDEX idx_app_health_activities_person
  ON app.health_activities(person_id) WHERE person_id IS NOT NULL;

CREATE TABLE app.health_profiles (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid NOT NULL UNIQUE REFERENCES app.people(id) ON DELETE CASCADE,
  height_cm numeric(5,2),
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_health_profiles_person ON app.health_profiles(person_id);

CREATE TRIGGER app_health_profiles_set_updated_at
  BEFORE UPDATE ON app.health_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE app.health_supplements (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  category text,
  dose text,
  notes text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_health_supplements_person ON app.health_supplements(person_id) WHERE person_id IS NOT NULL;

CREATE TRIGGER app_health_supplements_set_updated_at
  BEFORE UPDATE ON app.health_supplements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE app.health_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.health_observations FORCE ROW LEVEL SECURITY;
ALTER TABLE app.health_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.health_activities FORCE ROW LEVEL SECURITY;
ALTER TABLE app.health_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.health_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE app.health_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.health_supplements FORCE ROW LEVEL SECURITY;

CREATE POLICY app_health_observations_owner_policy ON app.health_observations
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_health_activities_owner_policy ON app.health_activities
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_health_profiles_owner_policy ON app.health_profiles
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

CREATE POLICY app_health_supplements_owner_policy ON app.health_supplements
  FOR ALL
  USING (auth.is_service_role() OR owner_userId = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userId = auth.current_user_id());

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS app.health_supplements;
DROP TABLE IF EXISTS app.health_profiles;
DROP TABLE IF EXISTS app.health_activities;
DROP TABLE IF EXISTS app.health_observations;

-- +goose StatementEnd
