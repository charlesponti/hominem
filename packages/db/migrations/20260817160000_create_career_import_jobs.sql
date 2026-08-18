-- +goose Up

CREATE TABLE IF NOT EXISTS app.career_import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userid TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  source_host TEXT NOT NULL,
  queue_job_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'queued',
  stage TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  draft JSONB,
  error_code TEXT,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  CONSTRAINT career_import_jobs_status_check CHECK (
    status IN ('queued', 'processing', 'ready', 'failed', 'dismissed', 'resolved')
  ),
  CONSTRAINT career_import_jobs_stage_check CHECK (
    stage IN (
      'queued',
      'validating-url',
      'fetching-posting',
      'extracting-fields',
      'validating-result',
      'draft-ready'
    )
  )
);

CREATE INDEX IF NOT EXISTS career_import_jobs_owner_updated_idx
  ON app.career_import_jobs (owner_userid, updated_at DESC);

CREATE INDEX IF NOT EXISTS career_import_jobs_owner_open_idx
  ON app.career_import_jobs (owner_userid, created_at DESC)
  WHERE status NOT IN ('dismissed', 'resolved');

ALTER TABLE app.career_import_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS career_import_jobs_owner ON app.career_import_jobs;
CREATE POLICY career_import_jobs_owner ON app.career_import_jobs
  USING (auth.is_service_role() OR owner_userid = auth.current_user_id())
  WITH CHECK (auth.is_service_role() OR owner_userid = auth.current_user_id());

-- +goose Down

DROP TABLE IF EXISTS app.career_import_jobs;
