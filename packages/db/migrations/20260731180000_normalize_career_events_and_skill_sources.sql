-- +goose Up
-- Follow-up design pass on app.career_events (see 20260731170000):
--
-- 1. Index cleanup: 9 indexes -> 3. Every real query and every RLS policy on
--    this table filters by owner_userid first, so app_career_events_timeline_idx
--    (owner_userid, event_date, event_type) already covers owner-only and
--    owner+date lookups via leftmost-prefix matching. The other 6 indexes have
--    no query consumer today.
--
-- 2. Column consolidation: the ~20 nullable typed columns (title/level/salary/
--    comp/equity/bonus/performance fields) only ever populate a handful per
--    row depending on event_type -- the same sparse-column problem the table
--    already solved for achievements/skills_gained/career_goals/
--    market_salary_range by using jsonb. Folding them into one `details`
--    column matches that precedent and removes the need to ALTER TABLE for
--    every new event subtype field.
--
-- 3. skills_gained is dropped, not folded into `details`. Gaining a skill
--    should create/attribute a real row in app.skills via the new
--    app.skill_sources join table, not a free-text string on the event --
--    that's what actually lets skills tie back to a specific work_experience
--    or project.

-- +goose StatementBegin

DROP INDEX IF EXISTS app.app_career_events_event_date_idx;
DROP INDEX IF EXISTS app.app_career_events_event_type_idx;
DROP INDEX IF EXISTS app.app_career_events_owner_userid_idx;
DROP INDEX IF EXISTS app.app_career_events_owner_date_idx;
DROP INDEX IF EXISTS app.app_career_events_owner_type_idx;
DROP INDEX IF EXISTS app.app_career_events_salary_increase_idx;

ALTER TABLE app.career_events
  DROP CONSTRAINT IF EXISTS app_career_events_equity_granted_check,
  DROP CONSTRAINT IF EXISTS app_career_events_bonus_amount_check,
  DROP CONSTRAINT IF EXISTS app_career_events_bonus_type_check;

ALTER TABLE app.career_events
  ADD COLUMN details jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE app.career_events
  DROP COLUMN previous_title,
  DROP COLUMN new_title,
  DROP COLUMN previous_level,
  DROP COLUMN new_level,
  DROP COLUMN previous_salary,
  DROP COLUMN new_salary,
  DROP COLUMN salary_increase,
  DROP COLUMN increase_percentage,
  DROP COLUMN previous_total_comp,
  DROP COLUMN new_total_comp,
  DROP COLUMN total_comp_increase,
  DROP COLUMN equity_granted,
  DROP COLUMN equity_vesting,
  DROP COLUMN bonus_amount,
  DROP COLUMN bonus_type,
  DROP COLUMN performance_rating,
  DROP COLUMN manager_feedback,
  DROP COLUMN self_assessment,
  DROP COLUMN market_salary_range,
  DROP COLUMN career_goals,
  DROP COLUMN skills_gained;

CREATE TABLE app.skill_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES app.skills(id) ON DELETE CASCADE,
  work_experience_id uuid REFERENCES app.work_experiences(id) ON DELETE CASCADE,
  project_id uuid REFERENCES app.projects(id) ON DELETE CASCADE,
  career_event_id uuid REFERENCES app.career_events(id) ON DELETE SET NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_skill_sources_exactly_one_target_check CHECK (
    (work_experience_id IS NOT NULL)::int + (project_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT app_skill_sources_unique UNIQUE NULLS NOT DISTINCT (skill_id, work_experience_id, project_id)
);

CREATE INDEX app_skill_sources_skill_id_idx
  ON app.skill_sources (skill_id);

CREATE INDEX app_skill_sources_work_experience_id_idx
  ON app.skill_sources (work_experience_id);

CREATE INDEX app_skill_sources_project_id_idx
  ON app.skill_sources (project_id);

CREATE INDEX app_skill_sources_career_event_id_idx
  ON app.skill_sources (career_event_id);

ALTER TABLE app.skill_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY app_skill_sources_select_policy ON app.skill_sources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM app.skills skill
      WHERE skill.id = skill_sources.skill_id
        AND (
          auth.is_portfolio_owner(skill.portfolio_id)
          OR (skill.is_visible = true AND auth.can_read_portfolio(skill.portfolio_id))
        )
    )
  );

CREATE POLICY app_skill_sources_owner_write_policy ON app.skill_sources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM app.skills skill
      WHERE skill.id = skill_sources.skill_id
        AND auth.is_portfolio_owner(skill.portfolio_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app.skills skill
      WHERE skill.id = skill_sources.skill_id
        AND auth.is_portfolio_owner(skill.portfolio_id)
    )
  );

-- +goose StatementEnd

-- +goose Down

-- +goose StatementBegin

DROP POLICY IF EXISTS app_skill_sources_owner_write_policy ON app.skill_sources;
DROP POLICY IF EXISTS app_skill_sources_select_policy ON app.skill_sources;
DROP TABLE IF EXISTS app.skill_sources CASCADE;

ALTER TABLE app.career_events
  ADD COLUMN previous_title text,
  ADD COLUMN new_title text,
  ADD COLUMN previous_level text,
  ADD COLUMN new_level text,
  ADD COLUMN previous_salary integer,
  ADD COLUMN new_salary integer,
  ADD COLUMN salary_increase integer,
  ADD COLUMN increase_percentage text,
  ADD COLUMN previous_total_comp integer,
  ADD COLUMN new_total_comp integer,
  ADD COLUMN total_comp_increase integer,
  ADD COLUMN equity_granted integer,
  ADD COLUMN equity_vesting text,
  ADD COLUMN bonus_amount integer,
  ADD COLUMN bonus_type text,
  ADD COLUMN performance_rating text,
  ADD COLUMN manager_feedback text,
  ADD COLUMN self_assessment text,
  ADD COLUMN market_salary_range jsonb,
  ADD COLUMN career_goals jsonb,
  ADD COLUMN skills_gained jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE app.career_events
  ADD CONSTRAINT app_career_events_equity_granted_check CHECK (
    equity_granted IS NULL OR equity_granted >= 0
  ),
  ADD CONSTRAINT app_career_events_bonus_amount_check CHECK (
    bonus_amount IS NULL OR bonus_amount >= 0
  ),
  ADD CONSTRAINT app_career_events_bonus_type_check CHECK (
    bonus_type IS NULL
    OR bonus_type IN ('annual', 'performance', 'retention', 'signing', 'spot', 'referral', 'project')
  );

ALTER TABLE app.career_events
  DROP COLUMN details;

CREATE INDEX app_career_events_owner_userId_idx
  ON app.career_events (owner_userId);

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

-- +goose StatementEnd
