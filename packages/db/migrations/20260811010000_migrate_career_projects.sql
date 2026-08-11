-- +goose Up

-- Target rows were migrated to application WISHLIST rows earlier. Do not silently
-- reintroduce that obsolete representation during this migration.
-- +goose StatementBegin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM app.career_positions WHERE is_target = true) THEN
    RAISE EXCEPTION 'career_positions still contains target rows';
  END IF;
END
$$;
-- +goose StatementEnd

CREATE TEMP TABLE career_project_migration_owner ON COMMIT DROP AS
SELECT owner_userid
FROM app.career_positions
WHERE record_type = 'project'
GROUP BY owner_userid
ORDER BY count(*) DESC, owner_userid
LIMIT 1;

-- Keep direct project links from the legacy table represented in the new join table.
INSERT INTO app.career_project_engagements (project_id, engagement_id, owner_userid)
SELECT p.id, p.position_id, p.owner_userid
FROM app.career_projects p
JOIN app.career_positions position
  ON position.id = p.position_id
 AND position.owner_userid = p.owner_userid
WHERE p.position_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE app.career_projects p
SET organization = position.company
FROM app.career_positions position
WHERE position.id = p.position_id
  AND position.owner_userid = p.owner_userid
  AND p.organization IS NULL;

-- The identified owner's seven actual initiatives become standalone portfolio
-- projects. The instructor and volunteer records remain work engagements.
INSERT INTO app.career_projects (
  id,
  owner_userid,
  organization,
  title,
  description,
  technologies,
  status,
  start_date,
  end_date,
  is_featured,
  is_visible,
  sort_order
)
SELECT
  position.id,
  position.owner_userid,
  position.company,
  position.title,
  position.description,
  '[]'::jsonb,
  CASE position.status::text
    WHEN 'BACKLOG' THEN 'backlog'
    WHEN 'IN_PROGRESS' THEN 'in-progress'
    WHEN 'DONE' THEN 'completed'
    WHEN 'CANCELED' THEN 'archived'
    ELSE 'backlog'
  END,
  position.start_date,
  position.end_date,
  false,
  true,
  row_number() OVER (ORDER BY position.start_date NULLS LAST, position.company, position.title)::int
FROM app.career_positions position
JOIN (
  SELECT owner_userid FROM career_project_migration_owner
) target_owner ON target_owner.owner_userid = position.owner_userid
WHERE position.record_type = 'project'
  AND NOT (
    position.company = 'General Assembly' AND position.title = 'Instructor'
  )
  AND NOT (
    position.company = 'Help Refugees' AND position.title = 'Volunteer'
  )
ON CONFLICT (id) DO UPDATE SET
  organization = EXCLUDED.organization,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date;

UPDATE app.career_positions
SET record_type = 'employment'
WHERE company = 'General Assembly'
  AND title = 'Instructor'
  AND record_type = 'project'
  AND owner_userid = (
    SELECT owner_userid FROM career_project_migration_owner
  );

UPDATE app.career_positions
SET record_type = 'volunteer'
WHERE company = 'Help Refugees'
  AND title = 'Volunteer'
  AND record_type = 'project'
  AND owner_userid = (
    SELECT owner_userid FROM career_project_migration_owner
  );

DELETE FROM app.career_positions position
WHERE position.owner_userid = (
    SELECT owner_userid FROM career_project_migration_owner
  )
  AND position.record_type = 'project'
  AND NOT (
    position.company = 'General Assembly' AND position.title = 'Instructor'
  )
  AND NOT (
    position.company = 'Help Refugees' AND position.title = 'Volunteer'
  )
  AND EXISTS (
    SELECT 1
    FROM app.career_projects project
    WHERE project.id = position.id
      AND project.owner_userid = position.owner_userid
  );

-- +goose StatementBegin
DO $$
DECLARE
  target_owner_id text;
  project_count integer;
BEGIN
  SELECT owner_userid INTO target_owner_id FROM career_project_migration_owner;
  IF target_owner_id IS NULL THEN
    RETURN;
  END IF;

  SELECT count(*) INTO project_count
  FROM app.career_projects
  WHERE owner_userid = target_owner_id
    AND id IN (
      SELECT id FROM app.career_positions WHERE owner_userid = target_owner_id
      UNION ALL
      SELECT id FROM app.career_projects WHERE owner_userid = target_owner_id
    );

  IF project_count < 7 THEN
    RAISE EXCEPTION 'Expected at least 7 project records, found %', project_count;
  END IF;

  IF EXISTS (
    SELECT 1 FROM app.career_positions
    WHERE owner_userid = target_owner_id AND record_type = 'project'
  ) THEN
    RAISE EXCEPTION 'Target owner still has project rows in career_positions';
  END IF;
END
$$;
-- +goose StatementEnd

-- +goose Down

-- Data cleanup is intentionally forward-only. Structural rollback retains the
-- normalized project rows and cannot losslessly recreate deleted position rows.
