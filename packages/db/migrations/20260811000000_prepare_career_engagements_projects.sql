-- +goose Up

ALTER TABLE app.career_projects
  ADD COLUMN organization text;

CREATE UNIQUE INDEX career_projects_owner_id_key
  ON app.career_projects (owner_userid, id);

CREATE UNIQUE INDEX career_positions_owner_id_key
  ON app.career_positions (owner_userid, id);

CREATE TABLE app.career_project_engagements (
  project_id uuid NOT NULL,
  engagement_id uuid NOT NULL,
  owner_userid text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, engagement_id),
  CONSTRAINT career_project_engagements_project_fkey
    FOREIGN KEY (project_id) REFERENCES app.career_projects(id) ON DELETE CASCADE,
  CONSTRAINT career_project_engagements_engagement_fkey
    FOREIGN KEY (engagement_id) REFERENCES app.career_positions(id) ON DELETE CASCADE,
  CONSTRAINT career_project_engagements_owner_project_fkey
    FOREIGN KEY (owner_userid, project_id)
    REFERENCES app.career_projects(owner_userid, id) ON DELETE CASCADE,
  CONSTRAINT career_project_engagements_owner_engagement_fkey
    FOREIGN KEY (owner_userid, engagement_id)
    REFERENCES app.career_positions(owner_userid, id) ON DELETE CASCADE
);

INSERT INTO app.career_project_engagements (project_id, engagement_id, owner_userid)
SELECT p.id, p.position_id, p.owner_userid
FROM app.career_projects p
WHERE p.position_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM app.career_positions position
    WHERE position.id = p.position_id
      AND position.owner_userid = p.owner_userid
  )
ON CONFLICT DO NOTHING;

CREATE INDEX career_project_engagements_owner_idx
  ON app.career_project_engagements (owner_userid);

CREATE INDEX career_project_engagements_project_idx
  ON app.career_project_engagements (project_id);

CREATE INDEX career_project_engagements_engagement_idx
  ON app.career_project_engagements (engagement_id);

ALTER TABLE app.career_project_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY career_project_engagements_owner_policy
  ON app.career_project_engagements
  USING (owner_userid = current_setting('app.current_user_id', true))
  WITH CHECK (owner_userid = current_setting('app.current_user_id', true));

CREATE TRIGGER set_updated_at_career_project_engagements
  BEFORE UPDATE ON app.career_project_engagements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- +goose Down

DROP TRIGGER IF EXISTS set_updated_at_career_project_engagements
  ON app.career_project_engagements;
DROP POLICY IF EXISTS career_project_engagements_owner_policy
  ON app.career_project_engagements;
DROP TABLE IF EXISTS app.career_project_engagements;
DROP INDEX IF EXISTS app.career_positions_owner_id_key;
DROP INDEX IF EXISTS app.career_projects_owner_id_key;
ALTER TABLE app.career_projects DROP COLUMN IF EXISTS organization;
