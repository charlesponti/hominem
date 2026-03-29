-- +goose Up
CREATE TABLE app.music_artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text,
  name text NOT NULL,
  image_url text,
  genre text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.music_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES app.music_artists(id) ON DELETE SET NULL,
  source text NOT NULL,
  external_id text,
  title text NOT NULL,
  artist_name text,
  release_date date,
  album_art_url text,
  genre text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.music_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  artist_id uuid REFERENCES app.music_artists(id) ON DELETE SET NULL,
  album_id uuid REFERENCES app.music_albums(id) ON DELETE SET NULL,
  source text NOT NULL,
  external_id text,
  title text NOT NULL,
  artist_name text,
  album_name text,
  album_art_url text,
  duration_seconds integer,
  track_number integer,
  disc_number integer,
  isrc text,
  genre text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple'::regconfig,
      coalesce(title, '') || ' ' || coalesce(artist_name, '') || ' ' || coalesce(album_name, '')
    )
  ) STORED,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.music_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text,
  name text NOT NULL,
  description text,
  image_url text,
  is_public boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.music_playlist_tracks (
  playlist_id uuid NOT NULL REFERENCES app.music_playlists(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES app.music_tracks(id) ON DELETE CASCADE,
  position integer NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (playlist_id, track_id)
);

CREATE TABLE app.music_listens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  track_id uuid REFERENCES app.music_tracks(id) ON DELETE SET NULL,
  source text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration_seconds integer,
  completed boolean NOT NULL DEFAULT false,
  context_type text,
  context_id text,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.video_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  source text NOT NULL,
  external_id text,
  name text NOT NULL,
  handle text,
  image text,
  subscriber_count integer,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_userId text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  channel_id uuid REFERENCES app.video_channels(id) ON DELETE SET NULL,
  content_type text NOT NULL,
  source text NOT NULL,
  external_id text,
  title text NOT NULL,
  description text,
  thumbnail_url text,
  duration_seconds integer,
  watched_at timestamptz NOT NULL,
  watch_time_seconds integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  season_number integer,
  episode_number integer,
  channel_name text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  createdAt timestamptz NOT NULL DEFAULT now(),
  updatedAt timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE IF EXISTS app.video_views;
DROP TABLE IF EXISTS app.video_channels;
DROP TABLE IF EXISTS app.music_listens;
DROP TABLE IF EXISTS app.music_playlist_tracks;
DROP TABLE IF EXISTS app.music_playlists;
DROP TABLE IF EXISTS app.music_tracks;
DROP TABLE IF EXISTS app.music_albums;
DROP TABLE IF EXISTS app.music_artists;
