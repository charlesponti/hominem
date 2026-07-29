-- Career dev seed — sample data for local development.
-- Schema is owned by Goose migrations; this file only inserts data.
-- Safe to re-run: all inserts are guarded by existence checks.

-- Override this with a psql variable when seeding an existing local user:
-- psql -v seed_user_email='charles.ponti@icloud.com' -f seed-career-dev.sql
\if :{?seed_user_email}
\else
\set seed_user_email 'charles@ponti.io'
\endif

BEGIN;

-- Resolve the target from its email. Seeding an unknown or ambiguous user is
-- unsafe, so fail before writing any career data.
CREATE TEMP TABLE seed_target_user ON COMMIT DROP AS
SELECT id
FROM "user"
WHERE email = :'seed_user_email';

DO $$
BEGIN
  IF (SELECT count(*) FROM seed_target_user) <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one user matching seed_user_email, found %',
      (SELECT count(*) FROM seed_target_user);
  END IF;
END;
$$;

SELECT id AS seed_user_id FROM seed_target_user;
\gset

-- Helpers that migrations assume exist at runtime
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updatedAt := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_userId', true), '')
$$;

CREATE OR REPLACE FUNCTION auth.is_service_role()
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_service_role', true), ''), 'false') = 'true'
$$;

-- Portfolio
INSERT INTO app.portfolios (
  id, owner_userId, slug, title, name, initials, job_title, bio, tagline,
  current_location, email, is_public, is_active
)
SELECT '565a8da7-0258-48de-80c9-edbed5e72e5b',
  :'seed_user_id',
  'charles-ponti',
  'Charles Ponti — Portfolio',
  'Charles Ponti',
  'CP',
  'Engineer & Builder',
  'Building products at the intersection of design, infrastructure, and taste. Previously led engineering teams across fintech, media, and enterprise SaaS.',
  'I build things that work.',
  'Los Angeles, CA',
  :'seed_user_email',
  true, true
WHERE NOT EXISTS (SELECT 1 FROM app.portfolios WHERE id = '565a8da7-0258-48de-80c9-edbed5e72e5b');

-- Social links
INSERT INTO app.user_social_links (user_id, github, linkedin, twitter, website)
SELECT :'seed_user_id',
  'https://github.com/ponti-studios',
  'https://linkedin.com/in/charlesponti',
  'https://x.com/charlesponti',
  'https://ponti.io'
WHERE NOT EXISTS (SELECT 1 FROM app.user_social_links WHERE user_id = :'seed_user_id');

-- Work experiences
INSERT INTO app.work_experiences (
  id, portfolio_id, role, company, description, start_date, end_date,
  employment_type, work_arrangement, seniority_level, is_visible, sort_order
)
SELECT v.id::uuid, '565a8da7-0258-48de-80c9-edbed5e72e5b',
  v.role, v.company, v.description,
  v.start_date::timestamptz, v.end_date::timestamptz,
  v.employment_type, v.work_arrangement, v.seniority_level, true, v.sort_order
FROM (VALUES
  ('10000000-0000-4000-8000-000000000001',         'Founder & CEO',             'Ponti Studios',     'Building experimental products across AI, media, and infrastructure.',                                '2022-01-01', NULL,             'full-time', 'remote', 'c-level',      1),
  ('10000000-0000-4000-8000-000000000002',        'Staff Engineer',            'Humana',             'Led health platform architecture for 5M+ members.',                                                  '2020-03-01', '2021-12-31',    'full-time', 'remote', 'staff',       2),
  ('10000000-0000-4000-8000-000000000003',      'Senior Software Engineer',  'Mimecast',           'Built cloud security infrastructure serving 40K+ businesses.',                                       '2017-06-01', '2020-02-29',    'full-time', 'office', 'senior',      3),
  ('10000000-0000-4000-8000-000000000004',         'Software Engineer',          'S&P Global',         'Developed financial data platforms and market intelligence tools.',                                   '2014-09-01', '2017-05-31',    'full-time', 'office', 'mid-level',   4),
  ('10000000-0000-4000-8000-000000000005',       'Software Engineer',          'Thomson Reuters',    'Built legal research and compliance platforms.',                                                      '2012-01-01', '2014-08-31',    'full-time', 'office', 'mid-level',   5),
  ('10000000-0000-4000-8000-000000000006',    'Senior Engineer',            'StreamYard',         'Scaled live streaming infrastructure to support 1M+ concurrent viewers.',                             '2021-01-01', '2021-12-31',    'contract',  'remote', 'senior',      6)
) AS v(id, role, company, description, start_date, end_date, employment_type, work_arrangement, seniority_level, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM app.work_experiences WHERE portfolio_id = '565a8da7-0258-48de-80c9-edbed5e72e5b');

-- Projects
INSERT INTO app.projects (
  portfolio_id, work_experience_id, title, short_description, description, technologies,
  github_url, live_url, status, is_featured, is_visible, sort_order, start_date
)
SELECT '565a8da7-0258-48de-80c9-edbed5e72e5b',
  (SELECT id FROM app.work_experiences
   WHERE portfolio_id = '565a8da7-0258-48de-80c9-edbed5e72e5b' AND company = v.company),
  v.title, v.short_description, v.description,
  v.technologies::jsonb, v.github_url, v.live_url, v.status, v.is_featured, true, v.sort_order,
  v.start_date::timestamptz
FROM (VALUES
  ('Craftd',     'Track applications, interviews, and your professional pipeline',
   'A web app for managing a job search pipeline — applications, interviews, follow-ups, and offers — in one place.',
   '["TypeScript", "React", "Hono", "PostgreSQL"]',
   'https://github.com/ponti-studios/hominem',
   'https://career.ponti.io',
   'completed', true, 1, '2026-06-16', 'Ponti Studios'),
  ('RealiTea',   'Daily word game built on real headlines',
   'A daily word puzzle where players guess real celebrity names by spelling them out from clues.',
   '["TypeScript", "React", "React Router", "PostgreSQL", "Drizzle"]',
   'https://github.com/ponti-studios/labs',
   'https://ponti.io/games/realitea',
   'completed', true, 2, '2026-06-23', 'Thomson Reuters'),
  ('Earth',      'Live map for exploring London traffic cameras',
   'A live geospatial viewer for browsing London''s TfL traffic camera network on an interactive map.',
   '["TypeScript", "React", "MapLibre", "PostgreSQL"]',
   'https://github.com/ponti-studios/labs',
   NULL,
   'in-progress', false, 3, '2026-03-04', 'Mimecast'),
  ('Health',     'Personal workspace for symptoms, care, and medication',
   'A personal health workspace for understanding symptoms, tracking progress, and organizing care.',
   '["TypeScript", "React", "React Router", "SQLite"]',
   'https://github.com/ponti-studios/labs',
   NULL,
   'in-progress', false, 4, '2026-04-20', 'Humana'),
  ('Commune',    'Anonymous peer deliberation for difficult decisions',
   'A social decision-making app that turns a personal situation into a neutral case for a small anonymous jury.',
   '["TypeScript", "React", "PostgreSQL", "AI"]',
   'https://github.com/ponti-studios/labs',
   NULL,
   'in-progress', false, 5, '2026-05-06', 'StreamYard'),
  ('Foundation', 'Enterprise shared infrastructure with Docker & PostgreSQL',
   'Shared infrastructure tooling for provisioning and running Docker and PostgreSQL services across projects.',
   '["Docker", "PostgreSQL", "GitHub Actions"]',
   'https://github.com/ponti-studios/foundation',
   NULL,
   'completed', false, 6, NULL, 'S&P Global')
) AS v(title, short_description, description, technologies, github_url, live_url, status, is_featured, sort_order, start_date, company)
WHERE NOT EXISTS (
  SELECT 1 FROM app.projects WHERE portfolio_id = '565a8da7-0258-48de-80c9-edbed5e72e5b'
);

-- Testimonials
INSERT INTO app.testimonials (
  portfolio_id, name, title, company, content, rating, is_verified, is_visible, sort_order
)
SELECT '565a8da7-0258-48de-80c9-edbed5e72e5b',
  v.name, v.title, v.company, v.content, v.rating, false, true, v.sort_order
FROM (VALUES
  ('Maya R.',   'Engineering Manager', 'Airbnb',
   'Charles shipped our onboarding redesign in half the time we''d scoped, and it held up perfectly under production load. Rare to find someone who moves that fast without cutting corners.',
   5, 1),
  ('Devon K.',  'Product Lead',         'Netflix',
   'One of the few engineers I''ve worked with who can go from a rough product idea to a working prototype in a single sprint.',
   5, 2),
  ('Priya S.',  'Staff Engineer',       'Reddit',
   'He rebuilt our recommendation pipeline end-to-end and cut infra costs by a meaningful margin in the process.',
   5, 3),
  ('Jordan T.', 'VP Engineering',       'HubSpot',
   'Sharp technical judgment, and even sharper at explaining it to non-technical stakeholders.',
   5, 4),
  ('Sam L.',    'Founder',              'Seed-stage startup',
   'Brought us from a rough prototype to production-ready in six weeks flat.',
   5, 5)
) AS v(name, title, company, content, rating, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM app.testimonials WHERE portfolio_id = '565a8da7-0258-48de-80c9-edbed5e72e5b'
);

-- Skills
INSERT INTO app.skills (portfolio_id, name, level, category, sort_order, is_visible)
SELECT '565a8da7-0258-48de-80c9-edbed5e72e5b', v.name, v.level, v.category, v.sort_order, true
FROM (VALUES
  ('TypeScript',     95, 'language',       1),
  ('React',          92, 'frontend',       2),
  ('PostgreSQL',     88, 'backend',       3),
  ('React Native',   85, 'mobile',        4),
  ('Node.js',        90, 'backend',       5),
  ('Docker',         82, 'devops',         6),
  ('Python',         75, 'language',       7),
  ('Swift',          65, 'mobile',         8),
  ('AWS',            78, 'devops',         9),
  ('GraphQL',        80, 'backend',       10)
) AS v(name, level, category, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM app.skills WHERE portfolio_id = '565a8da7-0258-48de-80c9-edbed5e72e5b'
);

-- Companies + job applications
INSERT INTO app.companies (owner_userid, name)
VALUES
  (:'seed_user_id', 'Airbnb'),
  (:'seed_user_id', 'AllTrails'),
  (:'seed_user_id', 'Amazon'),
  (:'seed_user_id', 'Bask Health'),
  (:'seed_user_id', 'BuildOps'),
  (:'seed_user_id', 'CTP'),
  (:'seed_user_id', 'Canva'),
  (:'seed_user_id', 'Chance App'),
  (:'seed_user_id', 'Change.org'),
  (:'seed_user_id', 'Charthop'),
  (:'seed_user_id', 'Clear Point Consultants'),
  (:'seed_user_id', 'Clear Point'),
  (:'seed_user_id', 'Coinbase'),
  (:'seed_user_id', 'Creator Club'),
  (:'seed_user_id', 'Duro'),
  (:'seed_user_id', 'EliseAI'),
  (:'seed_user_id', 'Empatico'),
  (:'seed_user_id', 'Epsilon Records / AudioKit'),
  (:'seed_user_id', 'EvenUp'),
  (:'seed_user_id', 'FIGS'),
  (:'seed_user_id', 'FINESSE'),
  (:'seed_user_id', 'Fabric Labs'),
  (:'seed_user_id', 'Faire'),
  (:'seed_user_id', 'FairyGodBoss'),
  (:'seed_user_id', 'Fanfix'),
  (:'seed_user_id', 'Farmdrop'),
  (:'seed_user_id', 'Figma'),
  (:'seed_user_id', 'Flex'),
  (:'seed_user_id', 'Forward Health'),
  (:'seed_user_id', 'Function Health'),
  (:'seed_user_id', 'Ghost'),
  (:'seed_user_id', 'Github'),
  (:'seed_user_id', 'Goldman Sachs'),
  (:'seed_user_id', 'Good Day Farm'),
  (:'seed_user_id', 'Guideline'),
  (:'seed_user_id', 'Harry''s'),
  (:'seed_user_id', 'Headspace'),
  (:'seed_user_id', 'Homes.com'),
  (:'seed_user_id', 'Hopper'),
  (:'seed_user_id', 'Howrecruit'),
  (:'seed_user_id', 'HubSpot'),
  (:'seed_user_id', 'Jobot'),
  (:'seed_user_id', 'Lab49'),
  (:'seed_user_id', 'Lightspark'),
  (:'seed_user_id', 'LinkedIn'),
  (:'seed_user_id', 'Luminate'),
  (:'seed_user_id', 'Makespace'),
  (:'seed_user_id', 'Mavely by Later'),
  (:'seed_user_id', 'Mavely'),
  (:'seed_user_id', 'Metalab'),
  (:'seed_user_id', 'Metropolis Technologies'),
  (:'seed_user_id', 'NBC Universal'),
  (:'seed_user_id', 'Needle'),
  (:'seed_user_id', 'Netflix'),
  (:'seed_user_id', 'New York Times'),
  (:'seed_user_id', 'Newsweek'),
  (:'seed_user_id', 'Oliver Wyman'),
  (:'seed_user_id', 'Onetera'),
  (:'seed_user_id', 'Pager'),
  (:'seed_user_id', 'Patagonia'),
  (:'seed_user_id', 'Peony.Ink'),
  (:'seed_user_id', 'Peony.lnk'),
  (:'seed_user_id', 'Pinterest'),
  (:'seed_user_id', 'Posh'),
  (:'seed_user_id', 'Producto'),
  (:'seed_user_id', 'Prologue'),
  (:'seed_user_id', 'Quilt'),
  (:'seed_user_id', 'Reddit'),
  (:'seed_user_id', 'Remo'),
  (:'seed_user_id', 'Resend'),
  (:'seed_user_id', 'Rhino'),
  (:'seed_user_id', 'Riverside'),
  (:'seed_user_id', 'Samsung TV Plus'),
  (:'seed_user_id', 'Samsung'),
  (:'seed_user_id', 'Sensay'),
  (:'seed_user_id', 'Serotonin'),
  (:'seed_user_id', 'Snapchat'),
  (:'seed_user_id', 'Spotter'),
  (:'seed_user_id', 'Squarespace'),
  (:'seed_user_id', 'Storm2'),
  (:'seed_user_id', 'Stubhub'),
  (:'seed_user_id', 'Substack'),
  (:'seed_user_id', 'Tasty'),
  (:'seed_user_id', 'Tatari'),
  (:'seed_user_id', 'ThreadBeast'),
  (:'seed_user_id', 'Tomo'),
  (:'seed_user_id', 'Tubi'),
  (:'seed_user_id', 'Twitch'),
  (:'seed_user_id', 'Two Chairs'),
  (:'seed_user_id', 'Vendigo'),
  (:'seed_user_id', 'Venue Platform, Inc.'),
  (:'seed_user_id', 'Vimeo'),
  (:'seed_user_id', 'Warner Bros Discovery'),
  (:'seed_user_id', 'Wealthfront'),
  (:'seed_user_id', 'Webflow'),
  (:'seed_user_id', 'Writer'),
  (:'seed_user_id', 'Zume')
ON CONFLICT (owner_userid, lower(name)) DO UPDATE SET updatedat = now();

INSERT INTO app.job_applications (
  owner_userid, company_id, position, status, start_date, location, source, link,
  application_date, company_notes, response_date, salary_quoted, createdat, updatedat
)
SELECT
  :'seed_user_id', c.id, ja.position, ja.status, ja.start_date, ja.location,
  ja.source, ja.link, ja.application_date, ja.company_notes,
  ja.response_date, ja.salary_quoted, ja.createdat, ja.updatedat
FROM (VALUES
  ('Change.org', 'Senior Product Manager', 'APPLIED', '2024-12-12T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-12-12T00:00:00.000Z'::timestamptz, NULL, '2013-10-16T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Airbnb', 'Software Engineer', 'REJECTED', '2025-01-02T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-02T00:00:00.000Z'::timestamptz, NULL, '2019-04-19T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Lab49', 'Software Engineer', 'REJECTED', '2025-01-15T00:00:00.000Z'::timestamptz, 'Remote', 'company_website', NULL, '2025-01-15T00:00:00.000Z'::timestamptz, NULL, '2019-04-29T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Onetera', 'Software Engineer', 'APPLIED', '2025-02-23T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-23T00:00:00.000Z'::timestamptz, NULL, '2020-02-15T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Newsweek', 'Product Manager', 'APPLIED', '2024-12-11T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-12-11T00:00:00.000Z'::timestamptz, NULL, '2020-05-21T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Canva', 'Software Engineer', 'APPLIED', '2024-05-08T07:00:00.000Z'::timestamptz, 'Remote', 'referral', NULL, '2024-05-08T07:00:00.000Z'::timestamptz, NULL, '2020-07-08T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Storm2', 'Product Manager', 'APPLIED', '2025-01-11T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-11T00:00:00.000Z'::timestamptz, NULL, '2020-07-04T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Figma', 'Software Engineer', 'APPLIED', '2024-12-09T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-12-09T00:00:00.000Z'::timestamptz, NULL, '2020-07-15T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Vendigo', 'Software Engineer', 'WITHDRAWN', '2025-01-15T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-15T00:00:00.000Z'::timestamptz, NULL, '2020-07-06T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Zume', 'Software Engineer', 'REJECTED', '2025-01-15T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-15T00:00:00.000Z'::timestamptz, NULL, '2020-07-15T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('FairyGodBoss', 'Software Engineer', 'REJECTED', '2020-07-27T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2020-07-27T00:00:00.000Z'::timestamptz, NULL, '2020-08-04T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Fanfix', 'Senior Backend Software Engineer', 'APPLIED', '2025-01-20T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-20T00:00:00.000Z'::timestamptz, NULL, '2020-08-11T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Rhino', 'Software Engineer', 'REJECTED', '2020-06-17T00:00:00.000Z'::timestamptz, 'Remote', 'glassdoor', NULL, '2020-06-17T00:00:00.000Z'::timestamptz, NULL, '2024-05-16T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Charthop', 'Software Engineer', 'REJECTED', '2020-06-25T00:00:00.000Z'::timestamptz, 'Remote', 'referral', NULL, '2020-06-25T00:00:00.000Z'::timestamptz, NULL, NULL, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Producto', 'Senior Product Manager - HealthTech/Pharma Chatbot', 'APPLIED', '2024-12-10T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-12-10T00:00:00.000Z'::timestamptz, NULL, '2024-05-16T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Goldman Sachs', 'Software Engineer', 'REJECTED', '2025-01-15T00:00:00.000Z'::timestamptz, 'Remote', 'referral', NULL, '2025-01-15T00:00:00.000Z'::timestamptz, NULL, '2024-05-25T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Warner Bros Discovery', 'Software Engineer', 'REJECTED', '2024-11-18T00:00:00.000Z'::timestamptz, 'Remote', 'referral', NULL, '2024-11-18T00:00:00.000Z'::timestamptz, NULL, '2024-05-22T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('NBC Universal', 'Software Engineer', 'APPLIED', '2025-02-22T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-22T00:00:00.000Z'::timestamptz, NULL, '2024-08-16T00:00:00.000Z'::timestamptz, '$140,000 - $185,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Resend', 'Software Engineer', 'REJECTED', '2025-01-29T00:00:00.000Z'::timestamptz, 'Remote', 'referral', NULL, '2025-01-29T00:00:00.000Z'::timestamptz, NULL, '2024-11-25T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Peony.Ink', 'Software Engineer', 'WITHDRAWN', '2024-05-14T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-05-14T00:00:00.000Z'::timestamptz, NULL, '2024-11-25T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Remo', 'Software Engineer', 'APPLIED', '2025-02-23T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-23T00:00:00.000Z'::timestamptz, NULL, '2024-11-30T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Amazon', 'Software Engineer', 'APPLIED', '2025-01-14T00:00:00.000Z'::timestamptz, 'Remote', 'referral', NULL, '2025-01-14T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Snapchat', 'Software Engineer', 'APPLIED', '2025-01-16T00:00:00.000Z'::timestamptz, 'Remote', 'recruiter', NULL, '2025-01-16T00:00:00.000Z'::timestamptz, NULL, '2024-12-04T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Tomo', 'Principal Software Engineer, Front End', 'APPLIED', '2025-02-20T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-20T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Airbnb', 'Software Engineer', 'APPLIED', '2025-01-28T00:00:00.000Z'::timestamptz, 'Remote', 'company_website', NULL, '2025-01-28T00:00:00.000Z'::timestamptz, 'Imported from Notion: https://www.notion.so/18a1c08cf4f98014a1c1d4cfa0d7c136?pvs=21', NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Squarespace', 'Software Engineer', 'REJECTED', '2024-11-14T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-11-14T00:00:00.000Z'::timestamptz, NULL, NULL, '$150,000 - $195,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('FIGS', 'Software Engineer II, Frontend', 'APPLIED', '2025-02-14T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-14T00:00:00.000Z'::timestamptz, NULL, '2024-12-12T00:00:00.000Z'::timestamptz, '$150,000 - $195,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Jobot', 'Senior Product Manager', 'APPLIED', '2025-01-06T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-06T00:00:00.000Z'::timestamptz, NULL, NULL, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Substack', 'Software Engineer', 'APPLIED', '2025-01-15T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-15T00:00:00.000Z'::timestamptz, NULL, NULL, '$140,000 - $185,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Lightspark', 'Software Engineer', 'APPLIED', '2025-01-22T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-22T00:00:00.000Z'::timestamptz, NULL, '2024-12-14T00:00:00.000Z'::timestamptz, '$140,000 - $185,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('AllTrails', 'Software Engineer', 'REJECTED', '2024-05-08T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-05-08T00:00:00.000Z'::timestamptz, NULL, '2024-12-15T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('BuildOps', 'Software Engineer', 'APPLIED', '2025-01-28T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-28T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Prologue', 'Software Engineer', 'PHONE_SCREEN', '2024-05-11T07:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-05-11T07:00:00.000Z'::timestamptz, NULL, '2025-01-13T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Reddit', 'Software Engineer', 'APPLIED', '2025-01-03T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-03T00:00:00.000Z'::timestamptz, NULL, NULL, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('LinkedIn', 'Product Manager, Feed Relevance', 'APPLIED', '2025-01-06T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-06T00:00:00.000Z'::timestamptz, NULL, '2025-01-11T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Clear Point', 'Software Engineer', 'APPLIED', '2025-01-11T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-11T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Empatico', 'Software Engineer', 'REJECTED', '2020-06-25T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2020-06-25T00:00:00.000Z'::timestamptz, NULL, '2025-01-20T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Function Health', 'Software Engineer', 'APPLIED', '2025-02-12T00:00:00.000Z'::timestamptz, 'Remote', 'company_website', NULL, '2025-02-12T00:00:00.000Z'::timestamptz, NULL, '2025-01-09T00:00:00.000Z'::timestamptz, '$140,000 - $185,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Pager', 'Software Engineer', 'REJECTED', '2025-01-15T00:00:00.000Z'::timestamptz, 'Remote', 'referral', NULL, '2025-01-15T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Spotter', 'Software Engineer', 'APPLIED', '2025-02-19T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-19T00:00:00.000Z'::timestamptz, NULL, NULL, '$150,000 - $195,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Tatari', 'Software Engineer', 'APPLIED', '2024-12-02T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-12-02T00:00:00.000Z'::timestamptz, NULL, '2025-01-10T00:00:00.000Z'::timestamptz, '$150,000 - $195,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('CTP', 'Product Manager', 'APPLIED', '2024-12-10T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-12-10T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Vimeo', 'Software Engineer', 'APPLIED', '2025-01-06T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-06T00:00:00.000Z'::timestamptz, NULL, '2025-01-15T00:00:00.000Z'::timestamptz, '$140,000 - $185,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Makespace', 'Software Engineer', 'REJECTED', '2020-06-19T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2020-06-19T00:00:00.000Z'::timestamptz, NULL, NULL, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Github', 'Software Engineer', 'REJECTED', '2020-07-27T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2020-07-27T00:00:00.000Z'::timestamptz, NULL, NULL, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('EliseAI', 'Software Engineer', 'APPLIED', '2025-01-28T00:00:00.000Z'::timestamptz, 'Remote', 'company_website', NULL, '2025-01-28T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Faire', 'Software Engineer', 'REJECTED', '2025-02-09T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-09T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Good Day Farm', 'Front-End Software Engineer', 'APPLIED', '2025-02-17T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-17T00:00:00.000Z'::timestamptz, NULL, '2025-01-23T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('EvenUp', 'Software Engineer', 'REJECTED', '2025-01-28T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-28T00:00:00.000Z'::timestamptz, NULL, '2025-01-20T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Writer', 'Software Engineer', 'REJECTED', '2025-01-28T00:00:00.000Z'::timestamptz, 'Remote', 'recruiter', NULL, '2025-01-28T00:00:00.000Z'::timestamptz, NULL, '2025-01-29T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Stubhub', 'Software Engineer', 'REJECTED', '2025-01-04T00:00:00.000Z'::timestamptz, 'Remote', 'indeed', NULL, '2025-01-04T00:00:00.000Z'::timestamptz, NULL, '2025-02-02T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Serotonin', 'Software Engineer', 'APPLIED', '2025-02-23T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-23T00:00:00.000Z'::timestamptz, NULL, '2025-01-27T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Metalab', 'Software Engineer', 'APPLIED', '2025-02-18T00:00:00.000Z'::timestamptz, 'Remote', 'indeed', NULL, '2025-02-18T00:00:00.000Z'::timestamptz, NULL, '2025-01-31T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Webflow', 'Software Engineer', 'REJECTED', '2025-02-13T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-13T00:00:00.000Z'::timestamptz, NULL, '2025-01-19T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Fabric Labs', 'Software Engineer', 'REJECTED', '2025-01-15T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-15T00:00:00.000Z'::timestamptz, NULL, '2025-01-17T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Samsung', 'Software Engineer', 'APPLIED', '2025-01-20T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-20T00:00:00.000Z'::timestamptz, NULL, NULL, '$150,000 - $195,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Farmdrop', 'Software Engineer', 'WITHDRAWN', '2013-10-11T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2013-10-11T00:00:00.000Z'::timestamptz, NULL, '2025-01-24T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Harry''s', 'Software Engineer', 'REJECTED', '2020-06-25T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2020-06-25T00:00:00.000Z'::timestamptz, NULL, '2025-01-23T00:00:00.000Z'::timestamptz, '$140,000 - $185,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('HubSpot', 'Software Engineer', 'APPLIED', '2025-01-09T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-09T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Twitch', 'Software Engineer', 'APPLIED', '2024-12-02T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-12-02T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('ThreadBeast', 'Senior Product Manager', 'APPLIED', '2024-12-10T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-12-10T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Ghost', 'Software Engineer', 'APPLIED', '2025-02-18T00:00:00.000Z'::timestamptz, 'Remote', 'indeed', NULL, '2025-02-18T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Luminate', 'Software Engineer', 'APPLIED', '2025-01-21T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-21T00:00:00.000Z'::timestamptz, NULL, '2025-02-07T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Patagonia', 'Software Engineer', 'REJECTED', '2025-02-01T00:00:00.000Z'::timestamptz, 'Remote', 'company_website', NULL, '2025-02-01T00:00:00.000Z'::timestamptz, NULL, '2025-02-16T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Tasty', 'Frontend Developer', 'APPLIED', '2025-02-14T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-02-14T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Netflix', 'Software Engineer', 'APPLIED', '2025-01-28T00:00:00.000Z'::timestamptz, 'Remote', 'referral', NULL, '2025-01-28T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Mavely', 'Software Engineer', 'APPLIED', '2025-01-06T00:00:00.000Z'::timestamptz, 'Remote', 'wellfound', NULL, '2025-01-06T00:00:00.000Z'::timestamptz, NULL, '2025-01-29T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Epsilon Records / AudioKit', 'Software Engineer', 'REJECTED', '2025-01-28T00:00:00.000Z'::timestamptz, 'Remote', 'indeed', NULL, '2025-01-28T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Pinterest', 'Software Engineer', 'APPLIED', '2025-01-15T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-15T00:00:00.000Z'::timestamptz, NULL, '2025-02-06T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Oliver Wyman', 'Software Engineer', 'REJECTED', '2020-05-05T00:00:00.000Z'::timestamptz, 'Remote', 'glassdoor', NULL, '2020-05-05T00:00:00.000Z'::timestamptz, NULL, '2025-02-12T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Hopper', 'Senior Product Manager, Capital One Travel Customer Experience', 'REJECTED', '2025-01-06T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-06T00:00:00.000Z'::timestamptz, NULL, NULL, '$150,000 - $195,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Riverside', 'Software Engineer', 'APPLIED', '2024-12-02T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-12-02T00:00:00.000Z'::timestamptz, NULL, '2025-02-19T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Peony.lnk', 'Software Engineer', 'PHONE_SCREEN', '2024-05-14T07:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2024-05-14T07:00:00.000Z'::timestamptz, NULL, NULL, '$150,000 - $195,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Guideline', 'Software Engineer', 'APPLIED', '2025-02-20T00:00:00.000Z'::timestamptz, 'Remote', 'indeed', NULL, '2025-02-20T00:00:00.000Z'::timestamptz, NULL, '2025-02-17T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Forward Health', 'Software Engineer', 'REJECTED', '2019-04-02T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2019-04-02T00:00:00.000Z'::timestamptz, NULL, NULL, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Quilt', 'Software Engineer', 'WITHDRAWN', '2019-04-18T00:00:00.000Z'::timestamptz, 'Remote', 'company_website', NULL, '2019-04-18T00:00:00.000Z'::timestamptz, NULL, '2025-02-23T00:00:00.000Z'::timestamptz, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Flex', 'Software Engineer', 'APPLIED', '2025-01-28T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2025-01-28T00:00:00.000Z'::timestamptz, NULL, NULL, '$110,000 - $155,000', '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('New York Times', 'Software Engineer', 'REJECTED', '2020-02-03T00:00:00.000Z'::timestamptz, 'Remote', 'linkedin', NULL, '2020-02-03T00:00:00.000Z'::timestamptz, NULL, NULL, NULL, '2026-03-02T10:05:34.866Z'::timestamptz, '2026-03-02T10:05:34.866Z'::timestamptz),
  ('Wealthfront', 'Software Engineer, Frontend', 'APPLIED', '2025-03-18T01:05:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4159642752', '2025-03-18T01:05:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, '$110,000 - $155,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Duro', 'Product Manager', 'APPLIED', '2024-08-15T20:06:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/3991549039', '2024-08-15T20:06:00.000Z'::timestamptz, 'Email: cj@ponti.io', '2025-02-20T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Sensay', 'Senior Full Stack / Team Lead', 'APPLIED', '2025-02-07T02:58:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4131812167', '2025-02-07T02:58:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, '$110,000 - $155,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('FINESSE', 'Senior Technical Product Manager', 'APPLIED', '2024-11-28T19:03:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4051257374', '2024-11-28T19:03:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, NULL, '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Tubi', 'Senior Frontend Software Engineer, ReactJS', 'APPLIED', '2025-02-28T22:10:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4160582383', '2025-02-28T22:10:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, NULL, '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Metropolis Technologies', 'Senior Web Engineer, Customer Experience', 'APPLIED', '2025-11-26T19:20:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4295073085', '2025-11-26T19:20:00.000Z'::timestamptz, 'Email: cj@ponti.io', '2025-02-24T00:00:00.000Z'::timestamptz, '$175,000 - $230,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Coinbase', 'Crypto Product Manager II - Consumer', 'APPLIED', '2024-12-10T21:03:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4076661091', '2024-12-10T21:03:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, '$110,000 - $155,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Samsung TV Plus', 'Product Manager, Consumer Experience, Samsung TV Plus', 'APPLIED', '2025-01-20T17:51:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4127882017', '2025-01-20T17:51:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, '$110,000 - $155,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Homes.com', 'Homes.com - Lead Software Engineer (vue/C#/.Net)', 'APPLIED', '2024-12-12T21:42:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4095499852', '2024-12-12T21:42:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, '$110,000 - $155,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Two Chairs', 'Senior Software Engineer', 'APPLIED', '2025-03-10T18:02:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4122634272', '2025-03-10T18:02:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, '$110,000 - $155,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Chance App', 'Founding Backend Engineer', 'APPLIED', '2025-01-21T00:23:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4104882106', '2025-01-21T00:23:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, '$175,000 - $230,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Bask Health', 'Senior Frontend Developer', 'APPLIED', '2025-12-03T19:13:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4321972606', '2025-12-03T19:13:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, '$150,000 - $195,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Creator Club', 'Senior Product Manager', 'APPLIED', '2025-01-29T18:20:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4138251361', '2025-01-29T18:20:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, '$150,000 - $195,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Headspace', 'Senior Software Engineer, API', 'APPLIED', '2025-03-01T21:22:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4144546616', '2025-03-01T21:22:00.000Z'::timestamptz, 'Email: cj@ponti.io', '2025-03-04T00:00:00.000Z'::timestamptz, '$150,000 - $195,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Howrecruit', 'Senior Software Engineer', 'APPLIED', '2025-03-06T18:40:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4176977244', '2025-03-06T18:40:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, '$150,000 - $195,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Clear Point Consultants', 'Startup Software Engineer', 'APPLIED', '2025-01-12T03:33:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4122424847', '2025-01-12T03:33:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, NULL, '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Venue Platform, Inc.', 'Senior Software Engineer', 'APPLIED', '2025-03-05T21:15:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4175201107', '2025-03-05T21:15:00.000Z'::timestamptz, 'Email: cj@ponti.io', NULL, NULL, '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Mavely by Later', 'Senior Product Manager', 'APPLIED', '2025-01-06T19:17:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4108327600', '2025-01-06T19:17:00.000Z'::timestamptz, 'Email: cj@ponti.io', '2025-03-19T00:00:00.000Z'::timestamptz, '$110,000 - $155,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Posh', 'Staff Full Stack Software Engineer', 'APPLIED', '2025-02-27T20:55:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4152432408', '2025-02-27T20:55:00.000Z'::timestamptz, 'Email: cj@ponti.io', '2025-11-29T00:00:00.000Z'::timestamptz, '$150,000 - $195,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz),
  ('Needle', 'Senior Software Engineer', 'APPLIED', '2025-02-28T22:32:00.000Z'::timestamptz, 'Remote', 'linkedin', 'http://www.linkedin.com/jobs/view/4170601461', '2025-02-28T22:32:00.000Z'::timestamptz, 'Email: cj@ponti.io', '2025-12-04T00:00:00.000Z'::timestamptz, '$150,000 - $195,000', '2026-06-30T02:07:18.000Z'::timestamptz, '2026-06-30T02:07:18.000Z'::timestamptz)
) AS ja(company_name, position, status, start_date, location, source, link, application_date, company_notes, response_date, salary_quoted, createdat, updatedat)
JOIN app.companies c ON c.owner_userid = :'seed_user_id' AND lower(c.name) = lower(ja.company_name)
WHERE NOT EXISTS (SELECT 1 FROM app.job_applications WHERE owner_userid = :'seed_user_id');

COMMIT;
