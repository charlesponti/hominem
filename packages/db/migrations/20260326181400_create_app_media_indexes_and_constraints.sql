-- +goose Up
ALTER TABLE app.music_artists
  ADD CONSTRAINT app_music_artists_source_not_blank CHECK (length(btrim(source)) > 0),
  ADD CONSTRAINT app_music_artists_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_music_artists_external_id_not_blank CHECK (
    external_id IS NULL OR length(btrim(external_id)) > 0
  );

ALTER TABLE app.music_albums
  ADD CONSTRAINT app_music_albums_source_not_blank CHECK (length(btrim(source)) > 0),
  ADD CONSTRAINT app_music_albums_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_music_albums_external_id_not_blank CHECK (
    external_id IS NULL OR length(btrim(external_id)) > 0
  );

ALTER TABLE app.music_tracks
  ADD CONSTRAINT app_music_tracks_source_not_blank CHECK (length(btrim(source)) > 0),
  ADD CONSTRAINT app_music_tracks_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_music_tracks_external_id_not_blank CHECK (
    external_id IS NULL OR length(btrim(external_id)) > 0
  ),
  ADD CONSTRAINT app_music_tracks_duration_seconds_check CHECK (
    duration_seconds IS NULL OR duration_seconds >= 0
  ),
  ADD CONSTRAINT app_music_tracks_track_number_check CHECK (
    track_number IS NULL OR track_number > 0
  ),
  ADD CONSTRAINT app_music_tracks_disc_number_check CHECK (
    disc_number IS NULL OR disc_number > 0
  );

ALTER TABLE app.music_playlists
  ADD CONSTRAINT app_music_playlists_source_not_blank CHECK (length(btrim(source)) > 0),
  ADD CONSTRAINT app_music_playlists_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_music_playlists_external_id_not_blank CHECK (
    external_id IS NULL OR length(btrim(external_id)) > 0
  );

ALTER TABLE app.music_playlist_tracks
  ADD CONSTRAINT app_music_playlist_tracks_position_check CHECK (position > 0);

ALTER TABLE app.music_listens
  ADD CONSTRAINT app_music_listens_source_not_blank CHECK (length(btrim(source)) > 0),
  ADD CONSTRAINT app_music_listens_duration_seconds_check CHECK (
    duration_seconds IS NULL OR duration_seconds >= 0
  ),
  ADD CONSTRAINT app_music_listens_time_order_check CHECK (
    ended_at IS NULL OR ended_at >= started_at
  );

ALTER TABLE app.video_channels
  ADD CONSTRAINT app_video_channels_source_not_blank CHECK (length(btrim(source)) > 0),
  ADD CONSTRAINT app_video_channels_name_not_blank CHECK (length(btrim(name)) > 0),
  ADD CONSTRAINT app_video_channels_external_id_not_blank CHECK (
    external_id IS NULL OR length(btrim(external_id)) > 0
  ),
  ADD CONSTRAINT app_video_channels_subscriber_count_check CHECK (
    subscriber_count IS NULL OR subscriber_count >= 0
  );

ALTER TABLE app.video_views
  ADD CONSTRAINT app_video_views_content_type_check CHECK (
    content_type IN ('video', 'episode', 'movie', 'clip', 'short')
  ),
  ADD CONSTRAINT app_video_views_source_not_blank CHECK (length(btrim(source)) > 0),
  ADD CONSTRAINT app_video_views_title_not_blank CHECK (length(btrim(title)) > 0),
  ADD CONSTRAINT app_video_views_external_id_not_blank CHECK (
    external_id IS NULL OR length(btrim(external_id)) > 0
  ),
  ADD CONSTRAINT app_video_views_duration_seconds_check CHECK (
    duration_seconds IS NULL OR duration_seconds >= 0
  ),
  ADD CONSTRAINT app_video_views_watch_time_seconds_check CHECK (watch_time_seconds >= 0),
  ADD CONSTRAINT app_video_views_season_number_check CHECK (
    season_number IS NULL OR season_number > 0
  ),
  ADD CONSTRAINT app_video_views_episode_number_check CHECK (
    episode_number IS NULL OR episode_number > 0
  );

CREATE UNIQUE INDEX app_music_artists_owner_source_external_key
  ON app.music_artists (owner_userId, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX app_music_artists_owner_name_idx
  ON app.music_artists (owner_userId, lower(name));

CREATE UNIQUE INDEX app_music_albums_owner_source_external_key
  ON app.music_albums (owner_userId, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX app_music_albums_owner_title_idx
  ON app.music_albums (owner_userId, lower(title));

CREATE INDEX app_music_albums_artist_id_idx
  ON app.music_albums (artist_id);

CREATE UNIQUE INDEX app_music_tracks_owner_source_external_key
  ON app.music_tracks (owner_userId, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX app_music_tracks_owner_title_idx
  ON app.music_tracks (owner_userId, lower(title));

CREATE INDEX app_music_tracks_artist_id_idx
  ON app.music_tracks (artist_id);

CREATE INDEX app_music_tracks_album_id_idx
  ON app.music_tracks (album_id);

CREATE INDEX app_music_tracks_search_idx
  ON app.music_tracks USING gin (search_vector);

CREATE UNIQUE INDEX app_music_playlists_owner_source_external_key
  ON app.music_playlists (owner_userId, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX app_music_playlists_owner_createdAt_idx
  ON app.music_playlists (owner_userId, createdAt DESC);

CREATE UNIQUE INDEX app_music_playlist_tracks_playlist_position_key
  ON app.music_playlist_tracks (playlist_id, position);

CREATE INDEX app_music_playlist_tracks_track_id_idx
  ON app.music_playlist_tracks (track_id);

CREATE INDEX app_music_listens_owner_started_at_idx
  ON app.music_listens (owner_userId, started_at DESC);

CREATE INDEX app_music_listens_track_id_idx
  ON app.music_listens (track_id);

CREATE UNIQUE INDEX app_video_channels_owner_source_external_key
  ON app.video_channels (owner_userId, source, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX app_video_channels_owner_name_idx
  ON app.video_channels (owner_userId, lower(name));

CREATE INDEX app_video_views_owner_watched_at_idx
  ON app.video_views (owner_userId, watched_at DESC);

CREATE INDEX app_video_views_channel_id_idx
  ON app.video_views (channel_id);

CREATE INDEX app_video_views_owner_content_type_idx
  ON app.video_views (owner_userId, content_type);

CREATE TRIGGER app_music_artists_set_updated_at
  BEFORE UPDATE ON app.music_artists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_music_albums_set_updated_at
  BEFORE UPDATE ON app.music_albums
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_music_tracks_set_updated_at
  BEFORE UPDATE ON app.music_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_music_playlists_set_updated_at
  BEFORE UPDATE ON app.music_playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_music_listens_set_updated_at
  BEFORE UPDATE ON app.music_listens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_video_channels_set_updated_at
  BEFORE UPDATE ON app.video_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER app_video_views_set_updated_at
  BEFORE UPDATE ON app.video_views
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- +goose Down
DROP TRIGGER IF EXISTS app_video_views_set_updated_at ON app.video_views;
DROP TRIGGER IF EXISTS app_video_channels_set_updated_at ON app.video_channels;
DROP TRIGGER IF EXISTS app_music_listens_set_updated_at ON app.music_listens;
DROP TRIGGER IF EXISTS app_music_playlists_set_updated_at ON app.music_playlists;
DROP TRIGGER IF EXISTS app_music_tracks_set_updated_at ON app.music_tracks;
DROP TRIGGER IF EXISTS app_music_albums_set_updated_at ON app.music_albums;
DROP TRIGGER IF EXISTS app_music_artists_set_updated_at ON app.music_artists;

DROP INDEX IF EXISTS app_video_views_owner_content_type_idx;
DROP INDEX IF EXISTS app_video_views_channel_id_idx;
DROP INDEX IF EXISTS app_video_views_owner_watched_at_idx;
DROP INDEX IF EXISTS app_video_channels_owner_name_idx;
DROP INDEX IF EXISTS app_video_channels_owner_source_external_key;
DROP INDEX IF EXISTS app_music_listens_track_id_idx;
DROP INDEX IF EXISTS app_music_listens_owner_started_at_idx;
DROP INDEX IF EXISTS app_music_playlist_tracks_track_id_idx;
DROP INDEX IF EXISTS app_music_playlist_tracks_playlist_position_key;
DROP INDEX IF EXISTS app_music_playlists_owner_createdAt_idx;
DROP INDEX IF EXISTS app_music_playlists_owner_source_external_key;
DROP INDEX IF EXISTS app_music_tracks_search_idx;
DROP INDEX IF EXISTS app_music_tracks_album_id_idx;
DROP INDEX IF EXISTS app_music_tracks_artist_id_idx;
DROP INDEX IF EXISTS app_music_tracks_owner_title_idx;
DROP INDEX IF EXISTS app_music_tracks_owner_source_external_key;
DROP INDEX IF EXISTS app_music_albums_artist_id_idx;
DROP INDEX IF EXISTS app_music_albums_owner_title_idx;
DROP INDEX IF EXISTS app_music_albums_owner_source_external_key;
DROP INDEX IF EXISTS app_music_artists_owner_name_idx;
DROP INDEX IF EXISTS app_music_artists_owner_source_external_key;

ALTER TABLE app.video_views
  DROP CONSTRAINT IF EXISTS app_video_views_episode_number_check,
  DROP CONSTRAINT IF EXISTS app_video_views_season_number_check,
  DROP CONSTRAINT IF EXISTS app_video_views_watch_time_seconds_check,
  DROP CONSTRAINT IF EXISTS app_video_views_duration_seconds_check,
  DROP CONSTRAINT IF EXISTS app_video_views_external_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_video_views_title_not_blank,
  DROP CONSTRAINT IF EXISTS app_video_views_source_not_blank,
  DROP CONSTRAINT IF EXISTS app_video_views_content_type_check;

ALTER TABLE app.video_channels
  DROP CONSTRAINT IF EXISTS app_video_channels_subscriber_count_check,
  DROP CONSTRAINT IF EXISTS app_video_channels_external_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_video_channels_name_not_blank,
  DROP CONSTRAINT IF EXISTS app_video_channels_source_not_blank;

ALTER TABLE app.music_listens
  DROP CONSTRAINT IF EXISTS app_music_listens_time_order_check,
  DROP CONSTRAINT IF EXISTS app_music_listens_duration_seconds_check,
  DROP CONSTRAINT IF EXISTS app_music_listens_source_not_blank;

ALTER TABLE app.music_playlist_tracks
  DROP CONSTRAINT IF EXISTS app_music_playlist_tracks_position_check;

ALTER TABLE app.music_playlists
  DROP CONSTRAINT IF EXISTS app_music_playlists_external_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_music_playlists_name_not_blank,
  DROP CONSTRAINT IF EXISTS app_music_playlists_source_not_blank;

ALTER TABLE app.music_tracks
  DROP CONSTRAINT IF EXISTS app_music_tracks_disc_number_check,
  DROP CONSTRAINT IF EXISTS app_music_tracks_track_number_check,
  DROP CONSTRAINT IF EXISTS app_music_tracks_duration_seconds_check,
  DROP CONSTRAINT IF EXISTS app_music_tracks_external_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_music_tracks_title_not_blank,
  DROP CONSTRAINT IF EXISTS app_music_tracks_source_not_blank;

ALTER TABLE app.music_albums
  DROP CONSTRAINT IF EXISTS app_music_albums_external_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_music_albums_title_not_blank,
  DROP CONSTRAINT IF EXISTS app_music_albums_source_not_blank;

ALTER TABLE app.music_artists
  DROP CONSTRAINT IF EXISTS app_music_artists_external_id_not_blank,
  DROP CONSTRAINT IF EXISTS app_music_artists_name_not_blank,
  DROP CONSTRAINT IF EXISTS app_music_artists_source_not_blank;
