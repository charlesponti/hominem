-- +goose Up
-- The 2026-07-28 cleanup migration (20260728200105_cleanup_unused_tables.sql)
-- dropped app.career_events and app.job_application_status_history as
-- "tables with no code consumer" -- that was wrong, both are still queried
-- directly in packages/db/src/services/career/portfolio.repository.ts.
-- Recreating them here with their original schema, indexes, constraints,
-- trigger, and (for career_events) RLS policy.

-- +goose StatementBegin

CREATE TABLE app.career_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  work_experience_id uuid REFERENCES app.work_experiences(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_date timestamptz NOT NULL,
  previous_title text,
  new_title text,
  previous_level text,
  new_level text,
  previous_salary integer,
  new_salary integer,
  salary_increase integer,
  increase_percentage text,
  previous_total_comp integer,
  new_total_comp integer,
  total_comp_increase integer,
  equity_granted integer,
  equity_vesting text,
  bonus_amount integer,
  bonus_type text,
  description text,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  skills_gained jsonb NOT NULL DEFAULT '[]'::jsonb,
  performance_rating text,
  manager_feedback text,
  self_assessment text,
  market_salary_range jsonb,
  career_goals jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.job_application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES app.job_applications(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  createdAt timestamptz NOT NULL DEFAULT now()
);

-- career_events constraints

ALTER TABLE app.career_events
  ADD CONSTRAINT app_career_events_date_not_future_check CHECK (event_date IS NOT NULL),
  ADD CONSTRAINT app_career_events_equity_granted_check CHECK (
    equity_granted IS NULL OR equity_granted >= 0
  ),
  ADD CONSTRAINT app_career_events_bonus_amount_check CHECK (
    bonus_amount IS NULL OR bonus_amount >= 0
  ),
  ADD CONSTRAINT app_career_events_event_type_check CHECK (
    event_type IN (
      'promotion',
      'raise',
      'bonus',
      'equity_grant',
      'role_change',
      'department_change',
      'location_change',
      'performance_review',
      'goal_achievement',
      'skill_milestone',
      'manager_change',
      'team_expansion'
    )
  ),
  ADD CONSTRAINT app_career_events_bonus_type_check CHECK (
    bonus_type IS NULL
    OR bonus_type IN ('annual', 'performance', 'retention', 'signing', 'spot', 'referral', 'project')
  );

CREATE INDEX app_career_events_owner_userId_idx
  ON app.career_events (owner_userId);

CREATE INDEX app_career_events_work_experience_id_idx
  ON app.career_events (work_experience_id);

CREATE INDEX app_career_events_event_type_idx
  ON app.career_events (event_type);

CREATE INDEX app_career_events_event_date_idx
  ON app.career_events (event_date);

CREATE INDEX app_career_events_salary_increase_idx
  ON app.career_events (salary_increase);

CREATE INDEX app_career_events_owner_date_idx
  ON app.career_events (owner_userId, event_date);

CREATE INDEX app_career_events_owner_type_idx
  ON app.career_events (owner_userId, event_type);

CREATE INDEX app_career_events_timeline_idx
  ON app.career_events (owner_userId, event_date, event_type);

CREATE TRIGGER app_career_events_set_updated_at
  BEFORE UPDATE ON app.career_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE app.career_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_career_events_owner_policy ON app.career_events
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_userId = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR (
      owner_userId = auth.current_user_id()
      AND (
        work_experience_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM app.work_experiences work_experience
          JOIN app.portfolios portfolio
            ON portfolio.id = work_experience.portfolio_id
          WHERE work_experience.id = work_experience_id
            AND portfolio.owner_userId = auth.current_user_id()
        )
      )
    )
  );

-- job_application_status_history constraints, indexes, trigger

ALTER TABLE app.job_application_status_history
  ADD CONSTRAINT app_job_application_status_history_new_status_check CHECK (
    new_status IN (
      'APPLIED',
      'PHONE_SCREEN',
      'INTERVIEW',
      'FINAL_INTERVIEW',
      'OFFER',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN'
    )
  ),
  ADD CONSTRAINT app_job_application_status_history_previous_status_check CHECK (
    previous_status IS NULL
    OR previous_status IN (
      'APPLIED',
      'PHONE_SCREEN',
      'INTERVIEW',
      'FINAL_INTERVIEW',
      'OFFER',
      'ACCEPTED',
      'REJECTED',
      'WITHDRAWN'
    )
  );

CREATE INDEX app_job_application_status_history_application_id_idx
  ON app.job_application_status_history (application_id);

CREATE INDEX app_job_application_status_history_application_changed_idx
  ON app.job_application_status_history (application_id, changed_at);

DROP TRIGGER IF EXISTS app_job_applications_log_status_change ON app.job_applications;

CREATE OR REPLACE FUNCTION app.log_job_application_status_change()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO app.job_application_status_history (application_id, previous_status, new_status, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_job_applications_log_status_change
  AFTER UPDATE ON app.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION app.log_job_application_status_change();

-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin

DROP TRIGGER IF EXISTS app_job_applications_log_status_change ON app.job_applications;
DROP FUNCTION IF EXISTS app.log_job_application_status_change();

DROP TABLE IF EXISTS app.job_application_status_history CASCADE;

DROP POLICY IF EXISTS app_career_events_owner_policy ON app.career_events;

DROP TRIGGER IF EXISTS app_career_events_set_updated_at ON app.career_events;

DROP TABLE IF EXISTS app.career_events CASCADE;

-- +goose StatementEnd
