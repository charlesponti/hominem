-- +goose Up

ALTER TABLE app.career_positions
  RENAME TO career_engagements;

ALTER TABLE app.career_engagements
  RENAME COLUMN record_type TO kind;

CREATE TYPE app.career_engagement_kind AS ENUM (
  'EMPLOYMENT',
  'CONTRACT',
  'FREELANCE',
  'VOLUNTEER',
  'OTHER'
);

ALTER TABLE app.career_engagements
  ALTER COLUMN kind DROP DEFAULT;

ALTER TABLE app.career_engagements
  ALTER COLUMN kind TYPE app.career_engagement_kind
  USING CASE lower(kind)
    WHEN 'employment' THEN 'EMPLOYMENT'::app.career_engagement_kind
    WHEN 'volunteer' THEN 'VOLUNTEER'::app.career_engagement_kind
    WHEN 'contract' THEN 'CONTRACT'::app.career_engagement_kind
    WHEN 'freelance' THEN 'FREELANCE'::app.career_engagement_kind
    ELSE 'OTHER'::app.career_engagement_kind
  END;

ALTER TABLE app.career_engagements
  ALTER COLUMN kind SET DEFAULT 'EMPLOYMENT'::app.career_engagement_kind;

ALTER TABLE app.career_projects
  ALTER COLUMN status DROP DEFAULT;

UPDATE app.career_projects
SET status = CASE lower(status)
  WHEN 'completed' THEN 'DONE'
  WHEN 'in-progress' THEN 'IN_PROGRESS'
  WHEN 'archived' THEN 'CANCELED'
  WHEN 'backlog' THEN 'BACKLOG'
  WHEN 'done' THEN 'DONE'
  WHEN 'canceled' THEN 'CANCELED'
  ELSE 'BACKLOG'
END;

ALTER TABLE app.career_projects
  ALTER COLUMN status TYPE app.career_project_status
  USING status::app.career_project_status;

ALTER TABLE app.career_projects
  ALTER COLUMN status SET DEFAULT 'BACKLOG'::app.career_project_status;

ALTER TABLE app.career_engagements
  ADD COLUMN reason_for_leaving text,
  DROP COLUMN is_target,
  DROP COLUMN status;

ALTER TABLE app.career_projects
  DROP CONSTRAINT IF EXISTS career_projects_position_id_fkey,
  DROP COLUMN position_id;

ALTER INDEX app.career_positions_owner_id_key
  RENAME TO career_engagements_owner_id_key;

ALTER TABLE app.career_project_engagements
  DROP CONSTRAINT career_project_engagements_engagement_fkey,
  ADD CONSTRAINT career_project_engagements_engagement_fkey
    FOREIGN KEY (engagement_id) REFERENCES app.career_engagements(id) ON DELETE CASCADE,
  DROP CONSTRAINT career_project_engagements_owner_engagement_fkey,
  ADD CONSTRAINT career_project_engagements_owner_engagement_fkey
    FOREIGN KEY (owner_userid, engagement_id)
    REFERENCES app.career_engagements(owner_userid, id) ON DELETE CASCADE;

-- +goose Down

ALTER TABLE app.career_projects
  ALTER COLUMN status TYPE text USING status::text;

ALTER TABLE app.career_projects
  ALTER COLUMN status SET DEFAULT 'completed';

ALTER TABLE app.career_engagements
  ADD COLUMN is_target boolean DEFAULT false,
  ADD COLUMN status app.career_project_status;

ALTER TABLE app.career_engagements
  DROP COLUMN IF EXISTS reason_for_leaving;

ALTER TABLE app.career_engagements
  ALTER COLUMN kind DROP DEFAULT;

ALTER TABLE app.career_engagements
  ALTER COLUMN kind TYPE text USING lower(kind::text);

ALTER TABLE app.career_engagements
  RENAME COLUMN kind TO record_type;

ALTER TABLE app.career_engagements
  ALTER COLUMN record_type SET DEFAULT 'employment';

ALTER TABLE app.career_engagements
  RENAME TO career_positions;

ALTER TABLE app.career_projects
  ADD COLUMN position_id uuid;

UPDATE app.career_projects project
SET position_id = engagement.engagement_id
FROM (
  SELECT DISTINCT ON (project_id) project_id, engagement_id
  FROM app.career_project_engagements
  ORDER BY project_id, engagement_id
) engagement
WHERE engagement.project_id = project.id;

ALTER TABLE app.career_projects
  ADD CONSTRAINT career_projects_position_id_fkey
    FOREIGN KEY (position_id) REFERENCES app.career_positions(id) ON DELETE SET NULL;

ALTER TABLE app.career_project_engagements
  DROP CONSTRAINT career_project_engagements_engagement_fkey,
  ADD CONSTRAINT career_project_engagements_engagement_fkey
    FOREIGN KEY (engagement_id) REFERENCES app.career_positions(id) ON DELETE CASCADE,
  DROP CONSTRAINT career_project_engagements_owner_engagement_fkey,
  ADD CONSTRAINT career_project_engagements_owner_engagement_fkey
    FOREIGN KEY (owner_userid, engagement_id)
    REFERENCES app.career_positions(owner_userid, id) ON DELETE CASCADE;

ALTER INDEX app.career_engagements_owner_id_key
  RENAME TO career_positions_owner_id_key;

DROP TYPE app.career_engagement_kind;
