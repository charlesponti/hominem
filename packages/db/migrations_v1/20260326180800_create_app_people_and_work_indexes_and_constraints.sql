-- +goose Up
ALTER TABLE app.people
  ADD CONSTRAINT app_people_person_type_check CHECK (person_type IN ('person', 'company', 'organization')),
  ADD CONSTRAINT app_people_time_order_check CHECK (ended_at IS NULL OR started_at IS NULL OR ended_at >= started_at);

ALTER TABLE app.person_relationships
  ADD CONSTRAINT app_person_relationships_relationship_type_not_blank CHECK (length(btrim(relationship_type)) > 0),
  ADD CONSTRAINT app_person_relationships_owner_person_key UNIQUE (owner_user_id, person_id, relationship_type);

ALTER TABLE app.task_lists
  ADD CONSTRAINT app_task_lists_name_not_blank CHECK (length(btrim(name)) > 0);

ALTER TABLE app.task_list_invites
  ADD CONSTRAINT app_task_list_invites_email_not_blank CHECK (length(btrim(invited_user_email)) > 0),
  ADD CONSTRAINT app_task_list_invites_token_not_blank CHECK (length(btrim(invite_token)) > 0),
  ADD CONSTRAINT app_task_list_invites_status_check CHECK (status IN ('pending', 'accepted', 'revoked', 'expired'));

ALTER TABLE app.tasks
  ADD CONSTRAINT app_tasks_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_tasks_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'archived')),
  ADD CONSTRAINT app_tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ADD CONSTRAINT app_tasks_completion_check CHECK (
    (completed_at IS NULL AND status <> 'completed') OR
    (completed_at IS NOT NULL AND status = 'completed')
  );

ALTER TABLE app.goals
  ADD CONSTRAINT app_goals_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_goals_status_check CHECK (status IN ('active', 'paused', 'completed', 'archived'));

ALTER TABLE app.key_results
  ADD CONSTRAINT app_key_results_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_key_results_value_check CHECK (
    target_value IS NULL OR current_value IS NULL OR target_value >= current_value OR current_value >= 0
  );

CREATE INDEX app_people_owner_user_id_idx
  ON app.people (owner_user_id, updated_at DESC);

CREATE INDEX app_people_search_idx
  ON app.people USING gin (search_vector);

CREATE INDEX app_people_email_idx
  ON app.people (lower(email))
  WHERE email IS NOT NULL;

CREATE INDEX app_person_relationships_owner_user_id_idx
  ON app.person_relationships (owner_user_id);

CREATE INDEX app_person_relationships_person_id_idx
  ON app.person_relationships (person_id);

CREATE INDEX app_task_lists_owner_user_id_idx
  ON app.task_lists (owner_user_id);

CREATE INDEX app_task_list_members_user_id_idx
  ON app.task_list_members (user_id);

CREATE UNIQUE INDEX app_task_list_invites_token_key
  ON app.task_list_invites (invite_token);

CREATE INDEX app_task_list_invites_list_id_idx
  ON app.task_list_invites (list_id);

CREATE INDEX app_task_list_invites_inviter_user_id_idx
  ON app.task_list_invites (inviter_user_id);

CREATE INDEX app_task_list_invites_invited_user_id_idx
  ON app.task_list_invites (invited_user_id);

CREATE INDEX app_task_list_invites_email_lower_idx
  ON app.task_list_invites (lower(invited_user_email));

CREATE INDEX app_tasks_owner_due_idx
  ON app.tasks (owner_user_id, due_at);

CREATE INDEX app_tasks_owner_status_idx
  ON app.tasks (owner_user_id, status);

CREATE INDEX app_tasks_open_idx
  ON app.tasks (owner_user_id, due_at, priority)
  WHERE status IN ('pending', 'in_progress');

CREATE INDEX app_tasks_list_id_idx
  ON app.tasks (list_id);

CREATE INDEX app_tasks_parent_task_id_idx
  ON app.tasks (parent_task_id);

CREATE INDEX app_goals_owner_status_idx
  ON app.goals (owner_user_id, status);

CREATE INDEX app_key_results_goal_id_idx
  ON app.key_results (goal_id);

CREATE TRIGGER app_people_set_updated_at
  BEFORE UPDATE ON app.people
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_person_relationships_set_updated_at
  BEFORE UPDATE ON app.person_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_task_lists_set_updated_at
  BEFORE UPDATE ON app.task_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_task_list_invites_set_updated_at
  BEFORE UPDATE ON app.task_list_invites
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_tasks_set_updated_at
  BEFORE UPDATE ON app.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_goals_set_updated_at
  BEFORE UPDATE ON app.goals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_key_results_set_updated_at
  BEFORE UPDATE ON app.key_results
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- +goose Down
DROP TRIGGER IF EXISTS app_key_results_set_updated_at ON app.key_results;
DROP TRIGGER IF EXISTS app_goals_set_updated_at ON app.goals;
DROP TRIGGER IF EXISTS app_tasks_set_updated_at ON app.tasks;
DROP TRIGGER IF EXISTS app_task_list_invites_set_updated_at ON app.task_list_invites;
DROP TRIGGER IF EXISTS app_task_lists_set_updated_at ON app.task_lists;
DROP TRIGGER IF EXISTS app_person_relationships_set_updated_at ON app.person_relationships;
DROP TRIGGER IF EXISTS app_people_set_updated_at ON app.people;

DROP INDEX IF EXISTS app_key_results_goal_id_idx;
DROP INDEX IF EXISTS app_goals_owner_status_idx;
DROP INDEX IF EXISTS app_tasks_parent_task_id_idx;
DROP INDEX IF EXISTS app_tasks_list_id_idx;
DROP INDEX IF EXISTS app_tasks_open_idx;
DROP INDEX IF EXISTS app_tasks_owner_status_idx;
DROP INDEX IF EXISTS app_tasks_owner_due_idx;
DROP INDEX IF EXISTS app_task_list_invites_email_lower_idx;
DROP INDEX IF EXISTS app_task_list_invites_invited_user_id_idx;
DROP INDEX IF EXISTS app_task_list_invites_inviter_user_id_idx;
DROP INDEX IF EXISTS app_task_list_invites_list_id_idx;
DROP INDEX IF EXISTS app_task_list_invites_token_key;
DROP INDEX IF EXISTS app_task_list_members_user_id_idx;
DROP INDEX IF EXISTS app_task_lists_owner_user_id_idx;
DROP INDEX IF EXISTS app_person_relationships_person_id_idx;
DROP INDEX IF EXISTS app_person_relationships_owner_user_id_idx;
DROP INDEX IF EXISTS app_people_email_idx;
DROP INDEX IF EXISTS app_people_search_idx;
DROP INDEX IF EXISTS app_people_owner_user_id_idx;

ALTER TABLE app.key_results
  DROP CONSTRAINT IF EXISTS app_key_results_value_check,
  DROP CONSTRAINT IF EXISTS app_key_results_title_not_blank;

ALTER TABLE app.goals
  DROP CONSTRAINT IF EXISTS app_goals_status_check,
  DROP CONSTRAINT IF EXISTS app_goals_title_not_blank;

ALTER TABLE app.tasks
  DROP CONSTRAINT IF EXISTS app_tasks_completion_check,
  DROP CONSTRAINT IF EXISTS app_tasks_priority_check,
  DROP CONSTRAINT IF EXISTS app_tasks_status_check,
  DROP CONSTRAINT IF EXISTS app_tasks_title_not_blank;

ALTER TABLE app.task_list_invites
  DROP CONSTRAINT IF EXISTS app_task_list_invites_status_check,
  DROP CONSTRAINT IF EXISTS app_task_list_invites_token_not_blank,
  DROP CONSTRAINT IF EXISTS app_task_list_invites_email_not_blank;

ALTER TABLE app.task_lists
  DROP CONSTRAINT IF EXISTS app_task_lists_name_not_blank;

ALTER TABLE app.person_relationships
  DROP CONSTRAINT IF EXISTS app_person_relationships_owner_person_key,
  DROP CONSTRAINT IF EXISTS app_person_relationships_relationship_type_not_blank;

ALTER TABLE app.people
  DROP CONSTRAINT IF EXISTS app_people_time_order_check,
  DROP CONSTRAINT IF EXISTS app_people_person_type_check;
