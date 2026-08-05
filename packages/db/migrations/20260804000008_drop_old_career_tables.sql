-- +goose Up

-- Drop all old career tables in FK-safe order.
-- CASCADE drops any dependent objects (policies, indexes, triggers).

DROP TABLE IF EXISTS app.application_notes CASCADE;
DROP TABLE IF EXISTS app.application_files CASCADE;
DROP TABLE IF EXISTS app.job_application_status_history CASCADE;
DROP TABLE IF EXISTS app.job_applications CASCADE;
DROP TABLE IF EXISTS app.career_events CASCADE;
DROP TABLE IF EXISTS app.skill_sources CASCADE;
DROP TABLE IF EXISTS app.skills CASCADE;
DROP TABLE IF EXISTS app.projects CASCADE;
DROP TABLE IF EXISTS app.testimonials CASCADE;
DROP TABLE IF EXISTS app.work_experiences CASCADE;
DROP TABLE IF EXISTS app.companies CASCADE;
DROP TABLE IF EXISTS app.portfolio_analytics CASCADE;
DROP TABLE IF EXISTS app.portfolio_stats CASCADE;
DROP TABLE IF EXISTS app.user_portfolio_preferences CASCADE;
DROP TABLE IF EXISTS app.user_social_links CASCADE;
DROP TABLE IF EXISTS app.certifications CASCADE;
DROP TABLE IF EXISTS app.portfolios CASCADE;

-- +goose Down

-- Restore old career tables from the original migration DDL.
-- This is a best-effort restore — schemas match the original 20260602124500 migration.
-- Data cannot be restored from the DOWN migration alone.

CREATE TABLE IF NOT EXISTS app.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  bio TEXT,
  tagline TEXT,
  current_location TEXT,
  email TEXT,
  is_public BOOLEAN DEFAULT false,
  profile_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.work_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES app.portfolios(id) ON DELETE CASCADE,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  employment_type TEXT DEFAULT 'full-time',
  work_arrangement TEXT DEFAULT 'on-site',
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES app.portfolios(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  start_date DATE,
  end_date DATE,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES app.portfolios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES app.portfolios(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES app.portfolios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuing_org TEXT,
  date_obtained DATE,
  expiration_date DATE,
  credential_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  company_id UUID REFERENCES app.companies(id),
  title TEXT NOT NULL,
  location TEXT,
  status TEXT,
  application_date DATE,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.career_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  work_experience_id UUID REFERENCES app.work_experiences(id),
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  details JSONB DEFAULT '{}',
  achievements JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.skill_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID REFERENCES app.portfolios(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES "user"(id),
  source_type TEXT NOT NULL,
  source_id UUID NOT NULL,
  skills TEXT[]
);

CREATE TABLE IF NOT EXISTS app.application_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES app.job_applications(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.application_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES app.job_applications(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.job_application_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES app.job_applications(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.portfolio_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES app.portfolios(id) ON DELETE CASCADE,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.portfolio_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES app.portfolios(id) ON DELETE CASCADE,
  visitor_ip TEXT,
  visit_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.user_portfolio_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  layout TEXT DEFAULT 'classic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.user_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
