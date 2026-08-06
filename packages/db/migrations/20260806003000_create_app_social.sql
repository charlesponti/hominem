-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.person_services (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  platform text NOT NULL,
  category text NOT NULL CHECK (category IN ('social', 'music_streaming', 'video_streaming', 'gaming', 'other')),
  handle text,
  display_name text,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (owner_userId, platform, person_id, handle)
);

CREATE TABLE app.social_contacts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  platform text NOT NULL,
  external_contact_id text,
  display_name text,
  phone_number text,
  kind text,
  is_mutual boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_userId, platform, external_contact_id, kind)
);

CREATE TABLE app.social_threads (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  platform text,
  external_id text,
  title text,
  is_group boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (owner_userId, platform, external_id)
);

CREATE TABLE app.social_messages (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES app.social_threads(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  sender_name text,
  sent_at timestamptz NOT NULL,
  body text,
  media_url text,
  is_call boolean NOT NULL DEFAULT false,
  call_duration_s integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_social_messages_thread_time ON app.social_messages(thread_id, sent_at);

CREATE TABLE app.social_thread_participants (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  thread_id uuid NOT NULL REFERENCES app.social_threads(id) ON DELETE CASCADE,
  person_id uuid NOT NULL REFERENCES app.people(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, person_id)
);

CREATE TABLE app.social_posts (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  platform text NOT NULL,
  external_id text,
  post_type text,
  caption text,
  location text,
  media_url text,
  posted_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_userId, platform, external_id)
);

CREATE TABLE app.social_engagements (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  post_id uuid REFERENCES app.social_posts(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  platform text NOT NULL,
  engagement_type text NOT NULL CHECK (engagement_type IN ('like', 'comment', 'reaction', 'connection')),
  body text,
  reaction text,
  occurred_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_social_engagements_post ON app.social_engagements(post_id) WHERE post_id IS NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS app.social_engagements;
DROP TABLE IF EXISTS app.social_posts;
DROP TABLE IF EXISTS app.social_thread_participants;
DROP TABLE IF EXISTS app.social_messages;
DROP TABLE IF EXISTS app.social_threads;
DROP TABLE IF EXISTS app.social_contacts;
DROP TABLE IF EXISTS app.person_services;

-- +goose StatementEnd
