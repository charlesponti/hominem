-- Career dev seed — realistic test data for all new career tables.
-- Finds the first existing user and seeds data under that user.
-- Safe to re-run: inserts guarded by existence checks.
-- Usage: psql -d hominem -f packages/db/seeds/seed_career_data.sql

BEGIN;

DO $$
DECLARE
  target_uid text;
BEGIN
  SELECT id INTO target_uid FROM "user" ORDER BY "createdAt" ASC LIMIT 1;
  IF target_uid IS NULL THEN
    RAISE EXCEPTION 'No users found — create a user first before seeding career data';
  END IF;

  -- ── Profile ────────────────────────────────────────────────────────────────

  INSERT INTO app.career_profile (
    id, owner_userid, slug, title, first_name, last_name, initials,
    headline, summary, tagline, email, phone, location, industry,
    birth_date, linkedin_url, twitter_handles, websites,
    profile_image_url, copyright, is_public, is_active,
    availability_status, open_to_remote, registered_at
  )
  SELECT
    '00000000-0000-4000-8000-000000000001',
    target_uid,
    'test-profile',
    'Alex Testman — Portfolio',
    'Alex',
    'Testman',
    'AT',
    'Senior Software Engineer',
    'Full-stack engineer with 10+ years building products across fintech, SaaS, and consumer.',
    'I build things that scale.',
    'alex@testman.dev',
    '+1-555-0100',
    'San Francisco, CA',
    'Technology',
    '1990-04-15',
    'https://linkedin.com/in/alextestman',
    '@alextestman',
    'https://testman.dev',
    'https://testman.dev/avatar.jpg',
    '© 2026 Alex Testman',
    true,
    true,
    false,
    true,
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_profile WHERE owner_userid = target_uid
  );

  -- ── Positions ──────────────────────────────────────────────────────────────

  INSERT INTO app.career_positions (
    id, owner_userid, company, title, description, location,
    start_date, end_date, is_current, is_target,
    salary_low, salary_high, currency, record_type
  )
  SELECT v.id::uuid, target_uid, v.company, v.title, v.description, v.location,
    v.start_date::date, v.end_date::date, v.is_current, false,
    v.salary_low, v.salary_high, 'USD', 'employment'
  FROM (VALUES
    ('00000000-0000-4000-8000-000000000010',
     'Stripe',
     'Staff Software Engineer',
     'Led the Payments API infrastructure team. Shipped real-time fraud detection pipeline.',
     'San Francisco, CA',
     '2022-03-01', NULL, true,
     210000, 280000),

    ('00000000-0000-4000-8000-000000000011',
     'Plaid',
     'Senior Software Engineer',
     'Built the Transactions enrichment service used by 5K+ fintech apps.',
     'San Francisco, CA',
     '2019-06-01', '2022-02-28', false,
     175000, 220000),

    ('00000000-0000-4000-8000-000000000012',
     'Square',
     'Software Engineer',
     'Core member of Orders Platform team. Shipped seller-facing features to 2M+ merchants.',
     'San Francisco, CA',
     '2016-09-01', '2019-05-31', false,
     130000, 165000)
  ) AS v(id, company, title, description, location, start_date, end_date, is_current, salary_low, salary_high)
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_positions WHERE owner_userid = target_uid
  );

  -- ── Education ──────────────────────────────────────────────────────────────

  INSERT INTO app.career_education (
    id, owner_userid, school, degree, field_of_study,
    start_date, end_date, activities, notes
  )
  SELECT v.id::uuid, target_uid, v.school, v.degree, v.field_of_study,
    v.start_date::date, v.end_date::date, v.activities, v.notes
  FROM (VALUES
    ('00000000-0000-4000-8000-000000000020',
     'Stanford University',
     'B.S. Computer Science',
     'Systems & Machine Learning',
     '2012-09-01', '2016-06-15',
     'TA for CS107; ACM ICPC team',
     'Graduated with distinction'),

    ('00000000-0000-4000-8000-000000000021',
     'UC Berkeley',
     'M.S. Computer Science',
     'Distributed Systems',
     '2018-01-01', '2020-05-15',
     'Published paper on consensus protocols at OSDI 2019',
     'Part-time program while working full-time')
  ) AS v(id, school, degree, field_of_study, start_date, end_date, activities, notes)
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_education WHERE owner_userid = target_uid
  );

  -- ── Applications ───────────────────────────────────────────────────────────

  INSERT INTO app.career_applications (
    id, owner_userid, company, title, location, source,
    applied_at, current_stage, status, salary_expectation, notes
  )
  SELECT v.id::uuid, target_uid, v.company, v.title, v.location, v.source,
    v.applied_at::date, v.current_stage, v.status, v.salary_expectation, v.notes
  FROM (VALUES
    ('00000000-0000-4000-8000-000000000030',
     'Notion',
     'Senior Platform Engineer',
     'San Francisco, CA',
     'referral',
     '2026-07-15',
     'technical_screen',
     'INTERVIEWING',
     230000,
     'Referred by former Stripe colleague. Excited about their data layer work.'),

    ('00000000-0000-4000-8000-000000000031',
     'Linear',
     'Staff Backend Engineer',
     'Remote',
     'company_website',
     '2026-06-01',
     'applied',
     'APPLIED',
     250000,
     'Love their approach to issue tracking. Applied cold — no response yet.'),

    ('00000000-0000-4000-8000-000000000032',
     'Figma',
     'Senior Software Engineer — Plugins',
     'SF / Remote',
     'linkedin',
     '2026-07-01',
     'rejected',
     'REJECTED',
     225000,
     'Made it to on-site. Feedback: strong systems but wanted more plugin experience.')
  ) AS v(id, company, title, location, source, applied_at, current_stage, status, salary_expectation, notes)
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_applications WHERE owner_userid = target_uid
  );

  -- ── Application Stages ─────────────────────────────────────────────────────

  INSERT INTO app.career_application_stages (
    id, application_id, stage, entered_at, notes
  )
  SELECT v.id::uuid, v.application_id::uuid, v.stage,
    v.entered_at::timestamptz, v.notes
  FROM (VALUES
    ('00000000-0000-4000-8000-000000000040',
     '00000000-0000-4000-8000-000000000030',
     'recruiter_screen',
     '2026-07-20 10:00:00+00',
     '30-min call with recruiter. Passed to hiring manager.'),

    ('00000000-0000-4000-8000-000000000041',
     '00000000-0000-4000-8000-000000000030',
     'technical_screen',
     '2026-07-28 14:00:00+00',
     '1-hour coding + system design. Felt solid.')
  ) AS v(id, application_id, stage, entered_at, notes)
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_application_stages
    WHERE application_id = '00000000-0000-4000-8000-000000000030'
  );

  -- ── Application Notes ──────────────────────────────────────────────────────

  INSERT INTO app.career_application_notes (id, application_id, content)
  SELECT '00000000-0000-4000-8000-000000000050',
    '00000000-0000-4000-8000-000000000030',
    'Follow up with hiring manager next week. Strong overlap with Plaid pipeline work.'
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_application_notes
    WHERE application_id = '00000000-0000-4000-8000-000000000030'
  );

  -- ── Application Files ──────────────────────────────────────────────────────

  INSERT INTO app.career_application_files (id, application_id, file_name, file_url, file_type)
  SELECT '00000000-0000-4000-8000-000000000055',
    '00000000-0000-4000-8000-000000000030',
    'alex_testman_resume_2026.pdf',
    'https://files.testman.dev/resumes/alex_testman_resume_2026.pdf',
    'application/pdf'
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_application_files
    WHERE application_id = '00000000-0000-4000-8000-000000000030'
  );

  -- ── Offers ─────────────────────────────────────────────────────────────────

  INSERT INTO app.career_offers (
    id, application_id, base_salary, equity, bonus,
    signing_bonus, total_comp, currency, decision, notes
  )
  SELECT '00000000-0000-4000-8000-000000000060',
    '00000000-0000-4000-8000-000000000032',
    215000,
    'ISO 40000 shares / 4-year vest',
    30000,
    20000,
    265000,
    'USD',
    'declined',
    'Competitive offer. Decided to focus on Notion and Linear pipelines.'
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_offers
    WHERE application_id = '00000000-0000-4000-8000-000000000032'
  );

  -- ── Skills ─────────────────────────────────────────────────────────────────

  INSERT INTO app.career_skills (
    id, owner_userid, name, category, level, years_of_experience, description, sort_order
  )
  SELECT v.id::uuid, target_uid, v.name, v.category, v.level,
    v.years_of_experience, v.description, v.sort_order
  FROM (VALUES
    ('00000000-0000-4000-8000-000000000070',
     'TypeScript', 'language', 95, 8,
     'Primary language. Deep expertise in type system and compiler internals.', 1),
    ('00000000-0000-4000-8000-000000000071',
     'PostgreSQL', 'backend', 90, 10,
     'Schema design, query optimization, replication.', 2),
    ('00000000-0000-4000-8000-000000000072',
     'React', 'frontend', 85, 7,
     'Server components, Suspense, RSC. Built libraries for 3 orgs.', 3)
  ) AS v(id, name, category, level, years_of_experience, description, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_skills WHERE owner_userid = target_uid
  );

  -- ── Projects ───────────────────────────────────────────────────────────────

  INSERT INTO app.career_projects (
    id, owner_userid, position_id, title, description, short_description,
    technologies, status, is_featured, sort_order
  )
  SELECT v.id::uuid, target_uid,
    (SELECT id FROM app.career_positions WHERE owner_userid = target_uid AND company = v.position_company LIMIT 1),
    v.title, v.description, v.short_description,
    v.technologies::jsonb, v.status, v.is_featured, v.sort_order
  FROM (VALUES
    ('00000000-0000-4000-8000-000000000080',
     'Stripe',
     'Real-Time Fraud Detection',
     'Designed and shipped a streaming fraud-detection pipeline processing 50K+ events/sec.',
     'Streaming fraud detection pipeline — 50K+ events/sec.',
     '["Kafka", "Flink", "Python", "PostgreSQL", "Redis"]',
     'completed', true, 1),
    ('00000000-0000-4000-8000-000000000081',
     'Plaid',
     'Transaction Enrichment Service',
     'Built a low-latency service that classifies bank transactions. 10M+ requests/day.',
     'Low-latency enrichment engine — 10M req/day.',
     '["Go", "PostgreSQL", "Redis", "gRPC", "Kubernetes"]',
     'completed', true, 2)
  ) AS v(id, position_company, title, description, short_description, technologies, status, is_featured, sort_order)
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_projects WHERE owner_userid = target_uid
  );

  -- ── Testimonials ───────────────────────────────────────────────────────────

  INSERT INTO app.career_testimonials (
    id, owner_userid, name, title, company, content, rating, is_verified, sort_order
  )
  SELECT '00000000-0000-4000-8000-000000000090',
    target_uid,
    'Priya N.',
    'Engineering Director',
    'Stripe',
    'Alex is one of the strongest systems engineers I''ve had on my team.',
    5, false, 1
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_testimonials WHERE owner_userid = target_uid
  );

  -- ── Certifications ─────────────────────────────────────────────────────────

  INSERT INTO app.career_certifications (
    id, owner_userid, name, issuing_organization,
    issue_date, expiration_date, category
  )
  SELECT '00000000-0000-4000-8000-000000000095',
    target_uid,
    'AWS Solutions Architect Professional',
    'Amazon Web Services',
    '2024-11-01',
    '2027-11-01',
    'cloud'
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_certifications WHERE owner_userid = target_uid
  );

  -- ── Social Links ───────────────────────────────────────────────────────────

  INSERT INTO app.career_social_links (
    id, owner_userid, github, linkedin, twitter, website
  )
  SELECT '00000000-0000-4000-8000-000000000100',
    target_uid,
    'https://github.com/alextestman',
    'https://linkedin.com/in/alextestman',
    'https://x.com/alextestman',
    'https://testman.dev'
  WHERE NOT EXISTS (
    SELECT 1 FROM app.career_social_links WHERE owner_userid = target_uid
  );

END $$;

COMMIT;
