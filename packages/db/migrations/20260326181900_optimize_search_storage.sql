-- +goose Up
DROP INDEX IF EXISTS app.app_note_versions_search_idx;
DROP INDEX IF EXISTS app.app_people_search_idx;
DROP INDEX IF EXISTS app.app_places_search_idx;
DROP INDEX IF EXISTS app.app_bookmarks_search_idx;
DROP INDEX IF EXISTS app.app_events_search_idx;
DROP INDEX IF EXISTS app.app_music_tracks_search_idx;

ALTER TABLE app.note_versions
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE app.people
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE app.places
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE app.bookmarks
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE app.events
  DROP COLUMN IF EXISTS search_vector;

ALTER TABLE app.music_tracks
  DROP COLUMN IF EXISTS search_vector;

CREATE INDEX app_note_versions_search_idx
  ON app.note_versions
  USING gin (
    to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || coalesce(content, ''))
  );

CREATE INDEX app_people_search_idx
  ON app.people
  USING gin (
    to_tsvector(
      'simple'::regconfig,
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' || coalesce(phone, '')
    )
  );

CREATE INDEX app_places_search_idx
  ON app.places
  USING gin (
    to_tsvector(
      'english'::regconfig,
      coalesce(name, '') || ' ' || coalesce(address, '') || ' ' || coalesce(notes, '')
    )
  );

CREATE INDEX app_bookmarks_search_idx
  ON app.bookmarks
  USING gin (
    to_tsvector(
      'english'::regconfig,
      coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(url, '')
    )
  );

CREATE INDEX app_events_search_idx
  ON app.events
  USING gin (
    to_tsvector(
      'english'::regconfig,
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  );

CREATE INDEX app_music_tracks_search_idx
  ON app.music_tracks
  USING gin (
    to_tsvector(
      'simple'::regconfig,
      coalesce(title, '') || ' ' || coalesce(artist_name, '') || ' ' || coalesce(album_name, '')
    )
  );

-- +goose Down
DROP INDEX IF EXISTS app.app_music_tracks_search_idx;
DROP INDEX IF EXISTS app.app_events_search_idx;
DROP INDEX IF EXISTS app.app_bookmarks_search_idx;
DROP INDEX IF EXISTS app.app_places_search_idx;
DROP INDEX IF EXISTS app.app_people_search_idx;
DROP INDEX IF EXISTS app.app_note_versions_search_idx;

ALTER TABLE app.note_versions
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english'::regconfig, coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED;

ALTER TABLE app.people
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple'::regconfig,
      coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' || coalesce(phone, '')
    )
  ) STORED;

ALTER TABLE app.places
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'english'::regconfig,
      coalesce(name, '') || ' ' || coalesce(address, '') || ' ' || coalesce(notes, '')
    )
  ) STORED;

ALTER TABLE app.bookmarks
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'english'::regconfig,
      coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(url, '')
    )
  ) STORED;

ALTER TABLE app.events
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'english'::regconfig,
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  ) STORED;

ALTER TABLE app.music_tracks
  ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple'::regconfig,
      coalesce(title, '') || ' ' || coalesce(artist_name, '') || ' ' || coalesce(album_name, '')
    )
  ) STORED;

CREATE INDEX app_note_versions_search_idx
  ON app.note_versions USING gin (search_vector);

CREATE INDEX app_people_search_idx
  ON app.people USING gin (search_vector);

CREATE INDEX app_places_search_idx
  ON app.places USING gin (search_vector);

CREATE INDEX app_bookmarks_search_idx
  ON app.bookmarks USING gin (search_vector);

CREATE INDEX app_events_search_idx
  ON app.events USING gin (search_vector);

CREATE INDEX app_music_tracks_search_idx
  ON app.music_tracks USING gin (search_vector);
