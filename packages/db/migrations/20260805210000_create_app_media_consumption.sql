-- +goose Up
-- +goose StatementBegin

CREATE TABLE app.person_artists (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  name text NOT NULL,
  sort_name text,
  discipline text,
  movement text,
  nationality text,
  birth_place text,
  active_from integer,
  active_to integer,
  notes text,
  spotify_id text,
  source text NOT NULL DEFAULT 'warehouse',
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_app_person_artists_owner_name ON app.person_artists(owner_userId, lower(name));
CREATE INDEX idx_app_person_artists_spotify ON app.person_artists(spotify_id) WHERE spotify_id IS NOT NULL;
CREATE INDEX idx_app_person_artists_person ON app.person_artists(person_id) WHERE person_id IS NOT NULL;

CREATE TABLE app.music_albums (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES app.person_artists(id) ON DELETE SET NULL,
  title text NOT NULL,
  release_date date,
  genre text,
  spotify_id text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_music_albums_artist ON app.music_albums(artist_id);

CREATE TABLE app.media_items (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  canonical_title text NOT NULL,
  media_kind text NOT NULL CHECK (media_kind IN (
    'movie', 'tv_show', 'video', 'book', 'periodical', 'game',
    'image', 'podcast', 'music_track', 'other', 'unknown'
  )),
  author text,
  publisher text,
  publication_date date,
  runtime_seconds integer,
  release_year integer,
  artist_id uuid REFERENCES app.person_artists(id) ON DELETE SET NULL,
  album_id uuid REFERENCES app.music_albums(id) ON DELETE SET NULL,
  duration_ms integer,
  genre text,
  genres text,
  release_date date,
  spotify_id text,
  popularity integer,
  preview_url text,
  composer text,
  disc_number integer,
  track_number integer,
  play_count integer NOT NULL DEFAULT 0,
  skip_count integer NOT NULL DEFAULT 0,
  like_rating text,
  date_added_to_library timestamptz,
  last_played_at timestamptz,
  enriched_at timestamptz,
  description text,
  cover_image_url text,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_media_items_owner_kind ON app.media_items(owner_userId, media_kind);
CREATE INDEX idx_app_media_items_artist ON app.media_items(artist_id) WHERE artist_id IS NOT NULL;
CREATE INDEX idx_app_media_items_album ON app.media_items(album_id) WHERE album_id IS NOT NULL;
CREATE INDEX idx_app_media_items_spotify ON app.media_items(spotify_id) WHERE spotify_id IS NOT NULL;

CREATE TABLE app.media_item_identifiers (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  media_item_id uuid NOT NULL REFERENCES app.media_items(id) ON DELETE CASCADE,
  provider text NOT NULL,
  identifier_type text NOT NULL,
  identifier_value text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (provider, identifier_type, identifier_value)
);
CREATE INDEX idx_app_media_item_identifiers_item ON app.media_item_identifiers(media_item_id);

CREATE TABLE app.media_item_activities (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  media_item_id uuid REFERENCES app.media_items(id) ON DELETE SET NULL,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  provider text,
  activity_type text NOT NULL CHECK (length(btrim(activity_type)) > 0),
  occurred_at timestamptz NOT NULL,
  rating numeric(3,1),
  season integer,
  episode integer,
  starred boolean NOT NULL DEFAULT false,
  rewatch_count integer NOT NULL DEFAULT 0,
  confidence numeric(4,3),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_app_media_item_activities_owner_time ON app.media_item_activities(owner_userId, occurred_at DESC);
CREATE INDEX idx_app_media_item_activities_item ON app.media_item_activities(media_item_id) WHERE media_item_id IS NOT NULL;
CREATE INDEX idx_app_media_item_activities_type_time ON app.media_item_activities(owner_userId, activity_type, occurred_at DESC);

CREATE TABLE app.media_collections (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  person_id uuid REFERENCES app.people(id) ON DELETE SET NULL,
  platform text,
  collection_type text NOT NULL,
  external_id text,
  name text,
  description text,
  visibility text,
  sort_order integer,
  source text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE NULLS NOT DISTINCT (owner_userId, platform, external_id)
);

CREATE TABLE app.media_collection_items (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  collection_id uuid NOT NULL REFERENCES app.media_collections(id) ON DELETE CASCADE,
  media_item_id uuid REFERENCES app.media_items(id) ON DELETE SET NULL,
  position integer,
  added_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collection_id, media_item_id)
);
CREATE INDEX idx_app_media_collection_items_collection ON app.media_collection_items(collection_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP TABLE IF EXISTS app.media_collection_items;
DROP TABLE IF EXISTS app.media_collections;
DROP TABLE IF EXISTS app.media_item_activities;
DROP TABLE IF EXISTS app.media_item_identifiers;
DROP TABLE IF EXISTS app.media_items;
DROP TABLE IF EXISTS app.music_albums;
DROP TABLE IF EXISTS app.person_artists;

-- +goose StatementEnd
