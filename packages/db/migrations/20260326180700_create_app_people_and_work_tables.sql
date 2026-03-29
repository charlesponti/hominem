-- +goose Up
CREATE TABLE app.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_type text NOT NULL DEFAULT 'person',
  first_name text,
  last_name text,
  email text,
  phone text,
  image text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple'::regconfig,
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' || coalesce(phone, '')
    )
  ) STORED,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.spaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  icon text,
  is_ordered boolean NOT NULL DEFAULT false,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.space_members (
  space_id uuid NOT NULL REFERENCES app.spaces(id) ON DELETE CASCADE,
  userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  added_by_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (space_id, userId)
);

CREATE TABLE app.space_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid NOT NULL REFERENCES app.spaces(id) ON DELETE CASCADE,
  inviter_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  invited_user_email text NOT NULL,
  invited_userId text REFERENCES "user"(id) ON DELETE SET NULL,
  invite_token text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  space_id uuid REFERENCES app.spaces(id) ON DELETE SET NULL,
  parent_task_id uuid REFERENCES app.tasks(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  due_at timestamptz,
  completed_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.key_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES app.goals(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_value numeric(12,2),
  current_value numeric(12,2),
  unit text,
  due_at timestamptz,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.chats
  ADD COLUMN space_id uuid REFERENCES app.spaces(id) ON DELETE SET NULL;

-- +goose Down
ALTER TABLE app.chats
  DROP COLUMN IF EXISTS space_id;
DROP TABLE IF EXISTS app.key_results;
DROP TABLE IF EXISTS app.goals;
DROP TABLE IF EXISTS app.tasks;
DROP TABLE IF EXISTS app.space_invites;
DROP TABLE IF EXISTS app.space_members;
DROP TABLE IF EXISTS app.spaces;
DROP TABLE IF EXISTS app.people;
