-- +goose Up

-- 1. app.career_skills
CREATE TABLE app.career_skills (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId        TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  category            TEXT,
  level               INTEGER,
  years_of_experience INTEGER,
  description         TEXT,
  proof               TEXT,
  ai_derived          BOOLEAN NOT NULL DEFAULT false,
  is_visible          BOOLEAN NOT NULL DEFAULT true,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_skills_owner ON app.career_skills(owner_userId);

ALTER TABLE app.career_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_skills_owner ON app.career_skills
  USING (auth.is_service_role() OR (owner_userId = auth.current_user_id()))
  WITH CHECK (auth.is_service_role() OR (owner_userId = auth.current_user_id()));

CREATE TRIGGER set_updated_at_career_skills
  BEFORE UPDATE ON app.career_skills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_snake();

-- 2. app.career_projects
CREATE TABLE app.career_projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  position_id       UUID REFERENCES app.career_positions(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  short_description TEXT,
  live_url          TEXT,
  github_url        TEXT,
  image_url         TEXT,
  video_url         TEXT,
  technologies      JSONB NOT NULL DEFAULT '[]'::jsonb,
  status            TEXT DEFAULT 'completed',
  start_date        DATE,
  end_date          DATE,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  is_visible        BOOLEAN NOT NULL DEFAULT true,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_projects_owner ON app.career_projects(owner_userId);
CREATE INDEX idx_career_projects_position ON app.career_projects(position_id);

ALTER TABLE app.career_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_projects_owner ON app.career_projects
  USING (auth.is_service_role() OR (owner_userId = auth.current_user_id()))
  WITH CHECK (auth.is_service_role() OR (owner_userId = auth.current_user_id()));

CREATE TRIGGER set_updated_at_career_projects
  BEFORE UPDATE ON app.career_projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_snake();

-- 3. app.career_testimonials
CREATE TABLE app.career_testimonials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId  TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  title         TEXT,
  company       TEXT,
  content       TEXT NOT NULL,
  avatar_url    TEXT,
  linkedin_url  TEXT,
  rating        INTEGER,
  is_verified   BOOLEAN NOT NULL DEFAULT false,
  is_visible    BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_testimonials_owner ON app.career_testimonials(owner_userId);

ALTER TABLE app.career_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_testimonials_owner ON app.career_testimonials
  USING (auth.is_service_role() OR (owner_userId = auth.current_user_id()))
  WITH CHECK (auth.is_service_role() OR (owner_userId = auth.current_user_id()));

CREATE TRIGGER set_updated_at_career_testimonials
  BEFORE UPDATE ON app.career_testimonials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_snake();

-- 4. app.career_certifications
CREATE TABLE app.career_certifications (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  position_id          UUID REFERENCES app.career_positions(id) ON DELETE SET NULL,
  name                 TEXT NOT NULL,
  description          TEXT,
  issuing_organization TEXT NOT NULL,
  issue_date           DATE,
  expiration_date      DATE,
  status               TEXT DEFAULT 'active',
  category             TEXT,
  is_visible           BOOLEAN NOT NULL DEFAULT true,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_certifications_owner ON app.career_certifications(owner_userId);
CREATE INDEX idx_career_certifications_position ON app.career_certifications(position_id);

ALTER TABLE app.career_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_certifications_owner ON app.career_certifications
  USING (auth.is_service_role() OR (owner_userId = auth.current_user_id()))
  WITH CHECK (auth.is_service_role() OR (owner_userId = auth.current_user_id()));

CREATE TRIGGER set_updated_at_career_certifications
  BEFORE UPDATE ON app.career_certifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_snake();

-- 5. app.career_social_links
CREATE TABLE app.career_social_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId  TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  github        TEXT,
  linkedin      TEXT,
  twitter       TEXT,
  website       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_career_social_links_owner ON app.career_social_links(owner_userId);

ALTER TABLE app.career_social_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_social_links_owner ON app.career_social_links
  USING (auth.is_service_role() OR (owner_userId = auth.current_user_id()))
  WITH CHECK (auth.is_service_role() OR (owner_userId = auth.current_user_id()));

CREATE TRIGGER set_updated_at_career_social_links
  BEFORE UPDATE ON app.career_social_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_snake();

-- 6. app.career_application_notes
CREATE TABLE app.career_application_notes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES app.career_applications(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_app_notes_app ON app.career_application_notes(application_id);

ALTER TABLE app.career_application_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_application_notes_owner ON app.career_application_notes
  USING (auth.is_service_role() OR
    EXISTS (
      SELECT 1 FROM app.career_applications
      WHERE career_applications.id = career_application_notes.application_id
      AND career_applications.owner_userId = auth.current_user_id()
    )
  );

-- 7. app.career_application_files
CREATE TABLE app.career_application_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  UUID NOT NULL REFERENCES app.career_applications(id) ON DELETE CASCADE,
  file_name       TEXT NOT NULL,
  file_url        TEXT NOT NULL,
  file_type       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_career_app_files_app ON app.career_application_files(application_id);

ALTER TABLE app.career_application_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY career_application_files_owner ON app.career_application_files
  USING (auth.is_service_role() OR
    EXISTS (
      SELECT 1 FROM app.career_applications
      WHERE career_applications.id = career_application_files.application_id
      AND career_applications.owner_userId = auth.current_user_id()
    )
  );

-- +goose Down

DROP TABLE IF EXISTS app.career_application_files;
DROP TABLE IF EXISTS app.career_application_notes;
DROP TABLE IF EXISTS app.career_social_links;
DROP TABLE IF EXISTS app.career_certifications;
DROP TABLE IF EXISTS app.career_testimonials;
DROP TABLE IF EXISTS app.career_projects;
DROP TABLE IF EXISTS app.career_skills;
