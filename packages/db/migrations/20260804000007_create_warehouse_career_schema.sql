-- +goose Up

-- 1. app.career_profile
CREATE TABLE app.career_profile (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  first_name      TEXT,
  last_name       TEXT,
  headline        TEXT,
  summary         TEXT,
  email           TEXT,
  phone           TEXT,
  location        TEXT,
  industry        TEXT,
  birth_date      DATE,
  twitter_handles TEXT,
  websites        TEXT,
  linkedin_url    TEXT,
  registered_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_career_profile_owner ON app.career_profile(owner_userId);

ALTER TABLE app.career_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_profile_owner ON app.career_profile
  USING (auth.is_service_role() OR (owner_userId = auth.current_user_id()))
  WITH CHECK (auth.is_service_role() OR (owner_userId = auth.current_user_id()));

CREATE TRIGGER set_updated_at_career_profile
  BEFORE UPDATE ON app.career_profile
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_snake();

-- 2. app.career_positions
CREATE TABLE app.career_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  company         TEXT NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  location        TEXT,
  start_date      DATE,
  end_date        DATE,
  is_current      BOOLEAN DEFAULT false,
  is_target       BOOLEAN DEFAULT false,
  salary_low      INTEGER,
  salary_high     INTEGER,
  currency        TEXT DEFAULT 'USD',
  address         TEXT,
  contact_name    TEXT,
  contact_phone   TEXT,
  source          TEXT DEFAULT 'career_employers',
  record_type     TEXT NOT NULL DEFAULT 'employment',
  url             TEXT,
  project_status  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_positions_owner ON app.career_positions(owner_userId);
CREATE INDEX idx_career_positions_company ON app.career_positions(company);
CREATE INDEX idx_career_positions_is_current ON app.career_positions(is_current) WHERE is_current = true;
CREATE INDEX idx_career_positions_is_target ON app.career_positions(is_target) WHERE is_target = true;

ALTER TABLE app.career_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_positions_owner ON app.career_positions
  USING (auth.is_service_role() OR (owner_userId = auth.current_user_id()))
  WITH CHECK (auth.is_service_role() OR (owner_userId = auth.current_user_id()));

CREATE TRIGGER set_updated_at_career_positions
  BEFORE UPDATE ON app.career_positions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_snake();

-- 3. app.career_education
CREATE TABLE app.career_education (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  school          TEXT NOT NULL,
  degree          TEXT,
  field_of_study  TEXT,
  start_date      DATE,
  end_date        DATE,
  activities      TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_education_owner ON app.career_education(owner_userId);

ALTER TABLE app.career_education ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_education_owner ON app.career_education
  USING (auth.is_service_role() OR (owner_userId = auth.current_user_id()))
  WITH CHECK (auth.is_service_role() OR (owner_userId = auth.current_user_id()));

CREATE TRIGGER set_updated_at_career_education
  BEFORE UPDATE ON app.career_education
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_snake();

-- 4. app.career_applications
CREATE TABLE app.career_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  company           TEXT NOT NULL,
  title             TEXT NOT NULL,
  location          TEXT,
  source            TEXT,
  referred_by       TEXT,
  applied_at        DATE,
  current_stage     TEXT,
  status            TEXT,
  resume_url        TEXT,
  cover_letter_url  TEXT,
  job_posting_url   TEXT,
  salary_expectation INTEGER,
  notes             TEXT,
  legacy_id         TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_apps_owner ON app.career_applications(owner_userId);
CREATE INDEX idx_career_apps_company ON app.career_applications(company);
CREATE INDEX idx_career_apps_status ON app.career_applications(status);
CREATE INDEX idx_career_apps_applied_at ON app.career_applications(applied_at);
CREATE INDEX idx_career_apps_source ON app.career_applications(source);

ALTER TABLE app.career_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_applications_owner ON app.career_applications
  USING (auth.is_service_role() OR (owner_userId = auth.current_user_id()))
  WITH CHECK (auth.is_service_role() OR (owner_userId = auth.current_user_id()));

CREATE TRIGGER set_updated_at_career_applications
  BEFORE UPDATE ON app.career_applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_snake();

-- 5. app.career_application_stages
CREATE TABLE app.career_application_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES app.career_applications(id) ON DELETE CASCADE,
  stage           TEXT NOT NULL,
  entered_at      TIMESTAMPTZ,
  exited_at       TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_stages_app ON app.career_application_stages(application_id);
CREATE INDEX idx_career_stages_stage ON app.career_application_stages(stage);
CREATE INDEX idx_career_stages_entered ON app.career_application_stages(entered_at);

ALTER TABLE app.career_application_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY career_stages_owner ON app.career_application_stages
  USING (auth.is_service_role() OR
    EXISTS (
      SELECT 1 FROM app.career_applications
      WHERE career_applications.id = career_application_stages.application_id
      AND career_applications.owner_userId = auth.current_user_id()
    )
  );

-- 6. app.career_offers
CREATE TABLE app.career_offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID REFERENCES app.career_applications(id) ON DELETE CASCADE,
  base_salary     INTEGER,
  equity          TEXT,
  bonus           INTEGER,
  signing_bonus   INTEGER,
  total_comp      INTEGER,
  currency        TEXT DEFAULT 'USD',
  decision        TEXT CHECK(decision IN ('accepted','declined','negotiating',NULL)),
  decision_at     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_offers_app ON app.career_offers(application_id);

ALTER TABLE app.career_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY career_offers_owner ON app.career_offers
  USING (auth.is_service_role() OR
    EXISTS (
      SELECT 1 FROM app.career_applications
      WHERE career_applications.id = career_offers.application_id
      AND career_applications.owner_userId = auth.current_user_id()
    )
  );

-- +goose Down

DROP TABLE IF EXISTS app.career_offers;
DROP TABLE IF EXISTS app.career_application_stages;
DROP TABLE IF EXISTS app.career_applications;
DROP TABLE IF EXISTS app.career_education;
DROP TABLE IF EXISTS app.career_positions;
DROP TABLE IF EXISTS app.career_profile;
