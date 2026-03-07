-- ============================================
-- UTILITY: Auto-update updated_at
-- ============================================
SET client_min_messages = warning;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX users_email_lower_idx ON users (lower(email));

-- Better-auth tables (minimal, adapted)
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX user_sessions_token_idx ON user_sessions(token);

CREATE TABLE user_accounts (
  id         TEXT PRIMARY KEY,
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  account_id TEXT NOT NULL,
  provider   TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, provider, account_id)
);

CREATE INDEX user_accounts_user_id_idx ON user_accounts(user_id);

CREATE TABLE user_api_keys (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX user_api_keys_user_id_idx ON user_api_keys(user_id);

-- ============================================
-- CORE: Unified Tagging System
-- ============================================

-- Tags with group for potential sharding
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  group_id TEXT, -- for database sharding, nullable
  name TEXT NOT NULL,
  emoji_image_url TEXT, -- stored as image URL, not emoji text
  color TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX tags_owner_id_idx ON tags(owner_id);
CREATE UNIQUE INDEX tags_owner_name_idx ON tags(owner_id, name);

-- Polymorphic join: tag any entity
CREATE TABLE tagged_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id      UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL, -- 'music_track', 'video', 'person', 'event', 'task', etc.
  entity_id   UUID NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tag_id, entity_type, entity_id)
);

CREATE INDEX tagged_items_entity_idx ON tagged_items(entity_type, entity_id);
CREATE INDEX tagged_items_tag_id_idx ON tagged_items(tag_id);

-- Sharing tags with other users
CREATE TABLE tag_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT DEFAULT 'read', -- 'read' or 'write'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tag_id, shared_with_user_id)
);

CREATE INDEX tag_shares_tag_id_idx ON tag_shares(tag_id);
CREATE INDEX tag_shares_user_id_idx ON tag_shares(shared_with_user_id);

-- ============================================
-- CORE: Unified Persons (Contacts, Relationships)
-- ============================================

CREATE TABLE persons (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id  UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  person_type    TEXT NOT NULL, -- 'self', 'contact', 'relationship', 'family', 'colleague'
  first_name     TEXT,
  last_name      TEXT,
  email          TEXT,
  phone          TEXT,
  avatar_url     TEXT,
  notes          TEXT,
  metadata       JSONB DEFAULT '{}',
  -- relationship-specific (nullable)
  date_started   TIMESTAMP WITH TIME ZONE,
  date_ended     TIMESTAMP WITH TIME ZONE,
  -- full-text search vector
  search_vector  TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name,  '') || ' ' ||
      coalesce(email,      '') || ' ' ||
      coalesce(phone,      '')
    )
  ) STORED,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX persons_owner_idx     ON persons(owner_user_id, person_type);
CREATE INDEX persons_email_idx     ON persons(owner_user_id, email);
CREATE INDEX persons_search_idx    ON persons USING GIN(search_vector);
CREATE INDEX persons_name_trgm_idx ON persons USING GIN((coalesce(first_name,'') || ' ' || coalesce(last_name,'')) gin_trgm_ops);

-- User-to-person relationships (I'm connected to this person as...)
CREATE TABLE user_person_relations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id)   ON DELETE CASCADE NOT NULL,
  person_id         UUID REFERENCES persons(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT, -- 'friend', 'family', 'coworker', 'dating', 'spouse', etc.
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, person_id)
);

CREATE INDEX user_person_relations_user_idx ON user_person_relations(user_id);
CREATE INDEX user_person_relations_person_idx ON user_person_relations(person_id);

-- ============================================
-- MUSIC: Tracks, Albums, Artists, Playlists
-- ============================================

CREATE TABLE music_tracks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  external_id      TEXT,
  source           TEXT NOT NULL, -- 'spotify', 'apple_music', 'youtube_music', 'local'
  title            TEXT NOT NULL,
  artist_name      TEXT,
  album_name       TEXT,
  album_art_url    TEXT,
  duration_seconds INT,
  track_number     INT,
  disc_number      INT,
  isrc             TEXT,
  genre            TEXT,
  data             JSONB DEFAULT '{}', -- provider-specific fields
  search_vector    TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(title, '') || ' ' || coalesce(artist_name, '') || ' ' || coalesce(album_name, '')
    )
  ) STORED,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX music_tracks_user_idx     ON music_tracks(user_id, source);
CREATE INDEX music_tracks_external_idx ON music_tracks(source, external_id);
CREATE INDEX music_tracks_search_idx   ON music_tracks USING GIN(search_vector);
CREATE INDEX music_tracks_isrc_idx     ON music_tracks(isrc) WHERE isrc IS NOT NULL;

CREATE TABLE music_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT,
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT,
  release_date TEXT,
  album_art_url TEXT,
  genre TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX music_albums_user_idx ON music_albums(user_id, source);

CREATE TABLE music_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT,
  genre TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX music_artists_user_idx     ON music_artists(user_id, source);
CREATE INDEX music_artists_external_idx ON music_artists(source, external_id);
CREATE INDEX music_artists_name_trgm    ON music_artists USING GIN(name gin_trgm_ops);

CREATE TABLE music_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT,
  source TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_public BOOLEAN DEFAULT false,
  track_count INT DEFAULT 0,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX music_playlists_user_idx ON music_playlists(user_id, source);

CREATE TABLE music_playlist_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES music_playlists(id) ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES music_tracks(id) ON DELETE CASCADE NOT NULL,
  position INT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

CREATE INDEX music_playlist_tracks_playlist_idx ON music_playlist_tracks(playlist_id, position);
CREATE INDEX music_playlist_tracks_track_idx    ON music_playlist_tracks(track_id);

-- Trigger: keep music_playlists.track_count accurate
CREATE OR REPLACE FUNCTION music_playlist_track_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE music_playlists SET track_count = track_count + 1 WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE music_playlists SET track_count = GREATEST(track_count - 1, 0) WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER music_playlist_tracks_count_insert
  AFTER INSERT ON music_playlist_tracks
  FOR EACH ROW EXECUTE FUNCTION music_playlist_track_count();

CREATE TRIGGER music_playlist_tracks_count_delete
  AFTER DELETE ON music_playlist_tracks
  FOR EACH ROW EXECUTE FUNCTION music_playlist_track_count();

CREATE TABLE music_liked (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID REFERENCES users(id)        ON DELETE CASCADE NOT NULL,
  track_id UUID REFERENCES music_tracks(id) ON DELETE CASCADE NOT NULL,
  source   TEXT NOT NULL,
  liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, track_id)
);

CREATE INDEX music_liked_user_idx ON music_liked(user_id, liked_at DESC);

-- ============================================
-- MUSIC: Listening History (partitioned by year)
-- NOTE: FK constraints omitted on partitioned tables — enforce at app layer.
-- Add new yearly partitions before each period begins (use pg_partman for automation).
-- ============================================

CREATE TABLE music_listening (
  id               UUID    NOT NULL DEFAULT gen_random_uuid(),
  user_id          UUID    NOT NULL,
  track_id         UUID,            -- nullable; app clears when track deleted
  source           TEXT    NOT NULL,
  started_at       TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at         TIMESTAMP WITH TIME ZONE,
  duration_seconds INT,
  completed        BOOLEAN DEFAULT false,
  context_type     TEXT,            -- 'playlist', 'album', 'search', 'radio'
  context_id       TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, started_at)     -- partition key must be part of PK
) PARTITION BY RANGE (started_at);

CREATE TABLE music_listening_2023    PARTITION OF music_listening FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE music_listening_2024    PARTITION OF music_listening FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE music_listening_2025    PARTITION OF music_listening FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE music_listening_2026    PARTITION OF music_listening FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE music_listening_default PARTITION OF music_listening DEFAULT;

CREATE INDEX music_listening_user_started_idx ON music_listening(user_id, started_at DESC);
CREATE INDEX music_listening_started_brin     ON music_listening USING BRIN(started_at) WITH (pages_per_range = 128);

-- ============================================
-- VIDEO: Watch History (partitioned by year), Channels, Shows
-- ============================================

-- Unified viewings - movies, TV, YouTube, etc.
CREATE TABLE video_viewings (
  id                 UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL,
  content_type       TEXT NOT NULL, -- 'movie', 'tv_show', 'youtube', 'tiktok'
  external_id        TEXT,
  source             TEXT NOT NULL, -- 'netflix', 'youtube', 'hulu', 'manual'
  title              TEXT NOT NULL,
  description        TEXT,
  thumbnail_url      TEXT,
  duration_seconds   INT,
  watched_at         TIMESTAMP WITH TIME ZONE NOT NULL,
  watch_time_seconds INT DEFAULT 0,
  completed          BOOLEAN DEFAULT false,
  season             INT,
  episode            INT,
  channel_name       TEXT,
  data               JSONB DEFAULT '{}',
  created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, watched_at)
) PARTITION BY RANGE (watched_at);

CREATE TABLE video_viewings_2023    PARTITION OF video_viewings FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE video_viewings_2024    PARTITION OF video_viewings FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE video_viewings_2025    PARTITION OF video_viewings FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE video_viewings_2026    PARTITION OF video_viewings FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE video_viewings_default PARTITION OF video_viewings DEFAULT;

CREATE INDEX video_viewings_user_watched_idx ON video_viewings(user_id, watched_at DESC);
CREATE INDEX video_viewings_content_type_idx ON video_viewings(user_id, content_type);
CREATE INDEX video_viewings_watched_brin     ON video_viewings USING BRIN(watched_at) WITH (pages_per_range = 128);

CREATE TABLE video_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  external_id TEXT,
  source TEXT NOT NULL, -- 'youtube', 'twitch'
  name TEXT NOT NULL,
  handle TEXT,
  avatar_url TEXT,
  subscriber_count INT,
  description TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX video_channels_user_idx ON video_channels(user_id, source);

CREATE TABLE video_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  channel_id UUID REFERENCES video_channels(id) ON DELETE CASCADE NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, channel_id)
);

-- ============================================
-- HEALTH: Time-series records (partitioned by year)
-- ============================================

CREATE TABLE health_records (
  id          UUID    NOT NULL DEFAULT gen_random_uuid(),
  user_id     UUID    NOT NULL,
  record_type TEXT    NOT NULL, -- 'activity', 'metric_steps', 'metric_heart_rate',
                                -- 'metric_weight', 'metric_bp_systolic',
                                -- 'metric_bp_diastolic', 'metric_sleep'
  value       DECIMAL(10, 2),
  unit        TEXT,
  source      TEXT,             -- 'apple_health', 'google_fit', 'garmin', 'manual'
  metadata    JSONB DEFAULT '{}',
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

CREATE TABLE health_records_2023    PARTITION OF health_records FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE health_records_2024    PARTITION OF health_records FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE health_records_2025    PARTITION OF health_records FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE health_records_2026    PARTITION OF health_records FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE health_records_default PARTITION OF health_records DEFAULT;

CREATE INDEX health_records_user_recorded_idx ON health_records(user_id, recorded_at DESC);
CREATE INDEX health_records_type_idx          ON health_records(user_id, record_type, recorded_at DESC);
CREATE INDEX health_records_recorded_brin     ON health_records USING BRIN(recorded_at) WITH (pages_per_range = 128);

-- ============================================
-- CALENDAR: Events and attendees
-- ============================================

CREATE TABLE calendar_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  event_type      TEXT NOT NULL, -- 'event', 'birthday', 'anniversary', 'habit', 'goal', 'travel'
  title           TEXT NOT NULL,
  description     TEXT,
  start_time      TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time        TIMESTAMP WITH TIME ZONE,
  all_day         BOOLEAN DEFAULT false,
  location        TEXT,
  location_coords JSONB,
  source          TEXT,  -- 'google_calendar', 'manual'
  external_id     TEXT,
  color           TEXT,
  recurring       JSONB, -- { frequency: 'weekly', interval: 1, end_date: ... }
  metadata        JSONB DEFAULT '{}',
  search_vector   TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, '')
    )
  ) STORED,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX calendar_events_user_time_idx ON calendar_events(user_id, start_time DESC);
CREATE INDEX calendar_events_search_idx    ON calendar_events USING GIN(search_vector);
-- Covering index for agenda/list views (avoids heap fetch for common columns)
CREATE INDEX calendar_events_agenda_idx    ON calendar_events(user_id, start_time, end_time, all_day) INCLUDE (title, color);

CREATE TABLE calendar_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE NOT NULL,
  person_id UUID REFERENCES persons(id) ON DELETE CASCADE,
  email TEXT,
  status TEXT DEFAULT 'needs_action', -- 'needs_action', 'accepted', 'declined', 'tentative'
  role TEXT DEFAULT 'required', -- 'required', 'optional', 'organizer'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX calendar_attendees_event_idx ON calendar_attendees(event_id);
CREATE INDEX calendar_attendees_person_idx ON calendar_attendees(person_id);

-- ============================================
-- TASKS & PROJECTS
-- ============================================

CREATE TABLE task_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX task_lists_user_idx ON task_lists(user_id);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  parent_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  list_id UUID REFERENCES task_lists(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX tasks_user_status_idx ON tasks(user_id, status);
CREATE INDEX tasks_user_due_idx    ON tasks(user_id, due_date);
-- Partial index: only open tasks (tiny, hot, fits in cache)
CREATE INDEX tasks_open_idx        ON tasks(user_id, due_date, priority)
  WHERE status IN ('pending', 'in_progress');

-- Goals and key results
CREATE TABLE goals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  target_date TIMESTAMP WITH TIME ZONE,
  status      TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX goals_user_status_idx ON goals(user_id, status);

CREATE TABLE key_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id       UUID REFERENCES goals(id) ON DELETE CASCADE NOT NULL,
  title         TEXT NOT NULL,
  target_value  DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  unit          TEXT,
  due_date      TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX key_results_goal_idx ON key_results(goal_id);

-- ============================================
-- FINANCE
-- ============================================

-- Finance categories (hierarchical, replaces loose category TEXT)
CREATE TABLE finance_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  parent_id  UUID REFERENCES finance_categories(id) ON DELETE SET NULL, -- hierarchical
  icon       TEXT,
  color      TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, name)
);

CREATE INDEX finance_categories_user_idx   ON finance_categories(user_id);
CREATE INDEX finance_categories_parent_idx ON finance_categories(parent_id);

CREATE TABLE finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL, -- 'checking', 'savings', 'investment', 'credit', 'loan', 'retirement'
  institution_name TEXT,
  institution_id TEXT,
  balance DECIMAL(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_active BOOLEAN DEFAULT true,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX finance_accounts_user_idx   ON finance_accounts(user_id);
-- Partial: only active accounts (the hot path)
CREATE INDEX finance_accounts_active_idx ON finance_accounts(user_id, account_type)
  WHERE is_active = true;

-- Finance transactions (partitioned by year on date)
-- FK to finance_accounts enforced at application layer on partitioned tables.
CREATE TABLE finance_transactions (
  id               UUID    NOT NULL DEFAULT gen_random_uuid(),
  user_id          UUID    NOT NULL,
  account_id       UUID    NOT NULL,
  amount           DECIMAL(12, 2) NOT NULL,
  transaction_type TEXT    NOT NULL, -- 'income', 'expense', 'transfer'
  category_id      UUID,             -- references finance_categories(id)
  category         TEXT,             -- denormalized for speed / legacy imports
  description      TEXT,
  merchant_name    TEXT,
  date             DATE    NOT NULL,
  date_raw         TEXT,
  pending          BOOLEAN DEFAULT false,
  source           TEXT,             -- 'plaid', 'manual', 'csv_import'
  external_id      TEXT,
  data             JSONB   DEFAULT '{}',
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, date)
) PARTITION BY RANGE (date);

CREATE TABLE finance_transactions_2022    PARTITION OF finance_transactions FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');
CREATE TABLE finance_transactions_2023    PARTITION OF finance_transactions FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE finance_transactions_2024    PARTITION OF finance_transactions FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE finance_transactions_2025    PARTITION OF finance_transactions FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE finance_transactions_2026    PARTITION OF finance_transactions FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE finance_transactions_default PARTITION OF finance_transactions DEFAULT;

CREATE INDEX finance_transactions_user_date_idx ON finance_transactions(user_id, date DESC);
CREATE INDEX finance_transactions_account_idx   ON finance_transactions(account_id, date DESC);
CREATE INDEX finance_transactions_category_idx  ON finance_transactions(user_id, category_id, date DESC)
  WHERE category_id IS NOT NULL;
CREATE INDEX finance_transactions_pending_idx   ON finance_transactions(user_id, date DESC)
  WHERE pending = true;
CREATE INDEX finance_transactions_date_brin     ON finance_transactions USING BRIN(date) WITH (pages_per_range = 32);

-- ============================================
-- PLACES & TRAVEL
-- ============================================

CREATE TABLE places (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  address     TEXT,
  -- Keep decimal columns for raw storage / API compatibility
  latitude    DECIMAL(10, 8),
  longitude   DECIMAL(11, 8),
  -- PostGIS geography for spatial queries (ST_DWithin, ST_Distance, etc.)
  -- Auto-populated from lat/long via trigger below
  location    GEOGRAPHY(POINT, 4326),
  place_type  TEXT, -- 'restaurant', 'hotel', 'airport', 'home', 'work'
  rating      DECIMAL(2, 1),
  notes       TEXT,
  data        JSONB DEFAULT '{}',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX places_user_idx     ON places(user_id);
CREATE INDEX places_type_idx     ON places(user_id, place_type);
CREATE INDEX places_location_idx ON places USING GIST(location); -- spatial index

-- Auto-sync PostGIS point from decimal lat/long
CREATE OR REPLACE FUNCTION places_sync_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(
      ST_MakePoint(NEW.longitude::float8, NEW.latitude::float8), 4326
    )::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER places_sync_location_trigger
  BEFORE INSERT OR UPDATE OF latitude, longitude ON places
  FOR EACH ROW EXECUTE FUNCTION places_sync_location();

CREATE TABLE travel_trips (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  start_date  DATE NOT NULL,
  end_date    DATE,
  status      TEXT DEFAULT 'planned',
  data        JSONB DEFAULT '{}',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX travel_trips_user_idx ON travel_trips(user_id, start_date DESC);

CREATE TABLE travel_flights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id)        ON DELETE CASCADE NOT NULL,
  trip_id           UUID REFERENCES travel_trips(id) ON DELETE SET NULL,
  flight_number     TEXT,
  airline           TEXT,
  departure_airport TEXT,
  arrival_airport   TEXT,
  departure_time    TIMESTAMP WITH TIME ZONE,
  arrival_time      TIMESTAMP WITH TIME ZONE,
  confirmation_code TEXT,
  seat              TEXT,
  data              JSONB DEFAULT '{}',
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX travel_flights_user_idx ON travel_flights(user_id, departure_time);
CREATE INDEX travel_flights_trip_idx ON travel_flights(trip_id);

CREATE TABLE travel_hotels (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id)        ON DELETE CASCADE NOT NULL,
  trip_id           UUID REFERENCES travel_trips(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  address           TEXT,
  check_in          DATE,
  check_out         DATE,
  confirmation_code TEXT,
  room_type         TEXT,
  data              JSONB DEFAULT '{}',
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX travel_hotels_user_idx ON travel_hotels(user_id, check_in);
CREATE INDEX travel_hotels_trip_idx ON travel_hotels(trip_id);

-- ============================================
-- CAREER & EDUCATION
-- ============================================

CREATE TABLE career_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  industry TEXT,
  size TEXT,
  website TEXT,
  logo_url TEXT,
  notes TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX career_companies_user_idx  ON career_companies(user_id);
CREATE INDEX career_companies_name_trgm ON career_companies USING GIN(name gin_trgm_ops);

CREATE TABLE career_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES career_companies(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  location TEXT,
  remote_type TEXT, -- 'onsite', 'hybrid', 'remote'
  salary_min BIGINT, -- store in minor currency unit (cents) to avoid rounding
  salary_max BIGINT,
  salary_currency TEXT DEFAULT 'USD',
  url TEXT,
  status TEXT DEFAULT 'interested', -- 'interested', 'applied', 'interviewing', 'offer', 'rejected'
  notes TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX career_jobs_user_idx ON career_jobs(user_id, status);

CREATE TABLE career_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  job_id UUID REFERENCES career_jobs(id) ON DELETE CASCADE NOT NULL,
  applied_at DATE,
  status TEXT DEFAULT 'applied',
  stage TEXT, -- 'applied', 'screening', 'interview', 'offer', 'rejected'
  outcome TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX career_applications_user_idx ON career_applications(user_id, stage);
CREATE INDEX career_applications_job_idx ON career_applications(job_id);

CREATE TABLE career_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES career_applications(id) ON DELETE CASCADE NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  format TEXT, -- 'phone', 'video', 'onsite'
  type TEXT, -- 'technical', 'behavioral', 'panel'
  interviewers JSONB DEFAULT '[]',
  feedback TEXT,
  outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX career_interviews_application_idx ON career_interviews(application_id);

CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  degree TEXT,
  field_of_study TEXT,
  start_year INT,
  end_year INT,
  gpa DECIMAL(3, 2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX schools_user_idx ON schools(user_id);

-- ============================================
-- NOTES
-- ============================================

CREATE TABLE notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title         TEXT,
  content       TEXT,
  source        TEXT,             -- 'apple_notes', 'google_keep', 'manual'
  is_locked     BOOLEAN DEFAULT false,
  -- shared_with JSONB replaced by note_shares join table below
  folder        TEXT,
  data          JSONB DEFAULT '{}',
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
  ) STORED,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX notes_user_updated_idx  ON notes(user_id, updated_at DESC);
CREATE INDEX notes_search_idx        ON notes USING GIN(search_vector);
CREATE INDEX notes_user_unlocked_idx ON notes(user_id, updated_at DESC)
  WHERE is_locked = false;

-- Note sharing: proper join table with referential integrity (replaces JSONB array)
CREATE TABLE note_shares (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id             UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  permission          TEXT DEFAULT 'read', -- 'read' | 'write'
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (note_id, shared_with_user_id)
);

CREATE INDEX note_shares_note_idx ON note_shares(note_id);
CREATE INDEX note_shares_user_idx ON note_shares(shared_with_user_id);

-- ============================================
-- BOOKMARKS & SAVED CONTENT
-- ============================================

CREATE TABLE bookmarks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  url           TEXT NOT NULL,
  title         TEXT,
  description   TEXT,
  favicon       TEXT,
  thumbnail     TEXT,
  source        TEXT, -- 'chrome', 'pocket', 'manual'
  folder        TEXT,
  data          JSONB DEFAULT '{}',
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(url, '')
    )
  ) STORED,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, url)  -- prevent duplicate bookmarks per user
);

CREATE INDEX bookmarks_user_idx   ON bookmarks(user_id, created_at DESC);
CREATE INDEX bookmarks_folder_idx ON bookmarks(user_id, folder) WHERE folder IS NOT NULL;
CREATE INDEX bookmarks_search_idx ON bookmarks USING GIN(search_vector);

-- ============================================
-- LOGS (partitioned by month — highest write volume table)
-- ============================================

CREATE TABLE logs (
  id          UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,
  action      TEXT NOT NULL, -- 'search', 'view', 'create', 'update', 'delete'
  entity_type TEXT,          -- 'track', 'video', 'person', 'event'
  entity_id   UUID,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE logs_2025_01 PARTITION OF logs FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE logs_2025_02 PARTITION OF logs FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE logs_2025_03 PARTITION OF logs FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE logs_2025_04 PARTITION OF logs FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE logs_2025_05 PARTITION OF logs FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE logs_2025_06 PARTITION OF logs FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE logs_2025_07 PARTITION OF logs FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE logs_2025_08 PARTITION OF logs FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE logs_2025_09 PARTITION OF logs FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE logs_2025_10 PARTITION OF logs FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE logs_2025_11 PARTITION OF logs FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE logs_2025_12 PARTITION OF logs FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');
CREATE TABLE logs_2026_01 PARTITION OF logs FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE logs_2026_02 PARTITION OF logs FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE logs_2026_03 PARTITION OF logs FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE logs_default  PARTITION OF logs DEFAULT;

CREATE INDEX logs_user_created_idx ON logs(user_id, created_at DESC);
CREATE INDEX logs_entity_idx       ON logs(entity_type, entity_id, created_at DESC)
  WHERE entity_type IS NOT NULL;
CREATE INDEX logs_created_brin     ON logs USING BRIN(created_at) WITH (pages_per_range = 128);

-- ============================================
-- SEARCHES (partitioned by quarter)
-- ============================================

CREATE TABLE searches (
  id                UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL,
  query             TEXT NOT NULL,
  results_count     INT,
  clicked_result_id UUID,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE searches_2025_q1 PARTITION OF searches FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');
CREATE TABLE searches_2025_q2 PARTITION OF searches FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');
CREATE TABLE searches_2025_q3 PARTITION OF searches FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE searches_2025_q4 PARTITION OF searches FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE searches_2026_q1 PARTITION OF searches FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE searches_default PARTITION OF searches DEFAULT;

CREATE INDEX searches_user_created_idx ON searches(user_id, created_at DESC);
CREATE INDEX searches_query_trgm       ON searches USING GIN(query gin_trgm_ops);
CREATE INDEX searches_created_brin     ON searches USING BRIN(created_at) WITH (pages_per_range = 128);

CREATE TABLE possession_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- 'garage', 'storage unit', 'closet'
  location TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX possession_containers_user_idx ON possession_containers(user_id);

CREATE TABLE possessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  container_id UUID REFERENCES possession_containers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'electronics', 'clothing', 'furniture', 'tools'
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  condition TEXT, -- 'new', 'good', 'fair', 'poor'
  location TEXT,
  serial_number TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX possessions_user_idx      ON possessions(user_id);
CREATE INDEX possessions_container_idx ON possessions(container_id);
CREATE INDEX possessions_category_idx  ON possessions(user_id, category);

-- ============================================
-- ENUMS (for reference — enforced via app layer or CHECK constraints)
-- ============================================

-- record_type:  activity | metric_steps | metric_heart_rate | metric_weight |
--               metric_bp_systolic | metric_bp_diastolic | metric_sleep
-- person_type:  self | contact | relationship | family | colleague
-- task status:  pending | in_progress | completed | cancelled
-- goal status:  active | completed | cancelled
-- account type: checking | savings | investment | credit | loan | retirement
-- tx type:      income | expense | transfer

-- ============================================
-- TRIGGERS: Auto-update updated_at
-- ============================================

CREATE TRIGGER users_updated_at            BEFORE UPDATE ON users            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER persons_updated_at          BEFORE UPDATE ON persons          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER music_tracks_updated_at     BEFORE UPDATE ON music_tracks     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER music_playlists_updated_at  BEFORE UPDATE ON music_playlists  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER calendar_events_updated_at  BEFORE UPDATE ON calendar_events  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tasks_updated_at            BEFORE UPDATE ON tasks            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER finance_accounts_updated_at BEFORE UPDATE ON finance_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER notes_updated_at            BEFORE UPDATE ON notes            FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- SECURITY: Roles + Tenant Context + RLS
-- ============================================

-- Optional application roles (idempotent; skips creation if caller lacks privilege)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
    CREATE ROLE app_service NOINHERIT;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping role creation (insufficient privilege).';
END;
$$;

-- Session context helpers.
-- Expected by app per-request:
--   SET LOCAL app.current_user_id = '<uuid>';
--   SET LOCAL app.is_service_role = 'false';

CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID
$$;

CREATE OR REPLACE FUNCTION app_is_service_role()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT COALESCE(NULLIF(current_setting('app.is_service_role', true), '')::BOOLEAN, false)
$$;

-- ----------
-- Enable RLS
-- ----------

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE tagged_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag_shares ENABLE ROW LEVEL SECURITY;

ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_person_relations ENABLE ROW LEVEL SECURITY;

ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_liked ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_listening ENABLE ROW LEVEL SECURITY;

ALTER TABLE video_viewings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_attendees ENABLE ROW LEVEL SECURITY;

ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;

ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_hotels ENABLE ROW LEVEL SECURITY;

ALTER TABLE career_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

ALTER TABLE possession_containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE possessions ENABLE ROW LEVEL SECURITY;

-- Optional hard mode: table owners also go through policies.
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE user_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys FORCE ROW LEVEL SECURITY;
ALTER TABLE tags FORCE ROW LEVEL SECURITY;
ALTER TABLE tagged_items FORCE ROW LEVEL SECURITY;
ALTER TABLE tag_shares FORCE ROW LEVEL SECURITY;
ALTER TABLE persons FORCE ROW LEVEL SECURITY;
ALTER TABLE user_person_relations FORCE ROW LEVEL SECURITY;
ALTER TABLE music_tracks FORCE ROW LEVEL SECURITY;
ALTER TABLE music_albums FORCE ROW LEVEL SECURITY;
ALTER TABLE music_artists FORCE ROW LEVEL SECURITY;
ALTER TABLE music_playlists FORCE ROW LEVEL SECURITY;
ALTER TABLE music_playlist_tracks FORCE ROW LEVEL SECURITY;
ALTER TABLE music_liked FORCE ROW LEVEL SECURITY;
ALTER TABLE music_listening FORCE ROW LEVEL SECURITY;
ALTER TABLE video_viewings FORCE ROW LEVEL SECURITY;
ALTER TABLE video_channels FORCE ROW LEVEL SECURITY;
ALTER TABLE video_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE health_records FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY;
ALTER TABLE calendar_attendees FORCE ROW LEVEL SECURITY;
ALTER TABLE task_lists FORCE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE goals FORCE ROW LEVEL SECURITY;
ALTER TABLE key_results FORCE ROW LEVEL SECURITY;
ALTER TABLE finance_categories FORCE ROW LEVEL SECURITY;
ALTER TABLE finance_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE places FORCE ROW LEVEL SECURITY;
ALTER TABLE travel_trips FORCE ROW LEVEL SECURITY;
ALTER TABLE travel_flights FORCE ROW LEVEL SECURITY;
ALTER TABLE travel_hotels FORCE ROW LEVEL SECURITY;
ALTER TABLE career_companies FORCE ROW LEVEL SECURITY;
ALTER TABLE career_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE career_applications FORCE ROW LEVEL SECURITY;
ALTER TABLE career_interviews FORCE ROW LEVEL SECURITY;
ALTER TABLE schools FORCE ROW LEVEL SECURITY;
ALTER TABLE notes FORCE ROW LEVEL SECURITY;
ALTER TABLE note_shares FORCE ROW LEVEL SECURITY;
ALTER TABLE bookmarks FORCE ROW LEVEL SECURITY;
ALTER TABLE logs FORCE ROW LEVEL SECURITY;
ALTER TABLE searches FORCE ROW LEVEL SECURITY;
ALTER TABLE possession_containers FORCE ROW LEVEL SECURITY;
ALTER TABLE possessions FORCE ROW LEVEL SECURITY;

-- -----------------------
-- Tenant isolation policy
-- -----------------------

DROP POLICY IF EXISTS users_tenant_policy ON users;
CREATE POLICY users_tenant_policy ON users
  FOR ALL
  USING (app_is_service_role() OR id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR id = app_current_user_id());

DROP POLICY IF EXISTS user_sessions_tenant_policy ON user_sessions;
CREATE POLICY user_sessions_tenant_policy ON user_sessions
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS user_accounts_tenant_policy ON user_accounts;
CREATE POLICY user_accounts_tenant_policy ON user_accounts
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS user_api_keys_tenant_policy ON user_api_keys;
CREATE POLICY user_api_keys_tenant_policy ON user_api_keys
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS tags_tenant_policy ON tags;
CREATE POLICY tags_tenant_policy ON tags
  FOR ALL
  USING (app_is_service_role() OR owner_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR owner_id = app_current_user_id());

DROP POLICY IF EXISTS tagged_items_tenant_policy ON tagged_items;
CREATE POLICY tagged_items_tenant_policy ON tagged_items
  FOR ALL
  USING (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM tags t
      WHERE t.id = tagged_items.tag_id
        AND t.owner_id = app_current_user_id()
    )
  )
  WITH CHECK (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM tags t
      WHERE t.id = tagged_items.tag_id
        AND t.owner_id = app_current_user_id()
    )
  );

DROP POLICY IF EXISTS tag_shares_select_policy ON tag_shares;
CREATE POLICY tag_shares_select_policy ON tag_shares
  FOR SELECT
  USING (
    app_is_service_role()
    OR shared_with_user_id = app_current_user_id()
    OR EXISTS (
      SELECT 1 FROM tags t
      WHERE t.id = tag_shares.tag_id
        AND t.owner_id = app_current_user_id()
    )
  );

DROP POLICY IF EXISTS tag_shares_owner_write_policy ON tag_shares;
CREATE POLICY tag_shares_owner_write_policy ON tag_shares
  FOR ALL
  USING (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM tags t
      WHERE t.id = tag_shares.tag_id
        AND t.owner_id = app_current_user_id()
    )
  )
  WITH CHECK (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM tags t
      WHERE t.id = tag_shares.tag_id
        AND t.owner_id = app_current_user_id()
    )
  );

DROP POLICY IF EXISTS persons_tenant_policy ON persons;
CREATE POLICY persons_tenant_policy ON persons
  FOR ALL
  USING (app_is_service_role() OR owner_user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR owner_user_id = app_current_user_id());

DROP POLICY IF EXISTS user_person_relations_tenant_policy ON user_person_relations;
CREATE POLICY user_person_relations_tenant_policy ON user_person_relations
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS music_tracks_tenant_policy ON music_tracks;
CREATE POLICY music_tracks_tenant_policy ON music_tracks
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS music_albums_tenant_policy ON music_albums;
CREATE POLICY music_albums_tenant_policy ON music_albums
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS music_artists_tenant_policy ON music_artists;
CREATE POLICY music_artists_tenant_policy ON music_artists
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS music_playlists_tenant_policy ON music_playlists;
CREATE POLICY music_playlists_tenant_policy ON music_playlists
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS music_playlist_tracks_tenant_policy ON music_playlist_tracks;
CREATE POLICY music_playlist_tracks_tenant_policy ON music_playlist_tracks
  FOR ALL
  USING (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM music_playlists p
      WHERE p.id = music_playlist_tracks.playlist_id
        AND p.user_id = app_current_user_id()
    )
  )
  WITH CHECK (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM music_playlists p
      WHERE p.id = music_playlist_tracks.playlist_id
        AND p.user_id = app_current_user_id()
    )
  );

DROP POLICY IF EXISTS music_liked_tenant_policy ON music_liked;
CREATE POLICY music_liked_tenant_policy ON music_liked
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS music_listening_tenant_policy ON music_listening;
CREATE POLICY music_listening_tenant_policy ON music_listening
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS video_viewings_tenant_policy ON video_viewings;
CREATE POLICY video_viewings_tenant_policy ON video_viewings
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS video_channels_tenant_policy ON video_channels;
CREATE POLICY video_channels_tenant_policy ON video_channels
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS video_subscriptions_tenant_policy ON video_subscriptions;
CREATE POLICY video_subscriptions_tenant_policy ON video_subscriptions
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS health_records_tenant_policy ON health_records;
CREATE POLICY health_records_tenant_policy ON health_records
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS calendar_events_tenant_policy ON calendar_events;
CREATE POLICY calendar_events_tenant_policy ON calendar_events
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS calendar_attendees_tenant_policy ON calendar_attendees;
CREATE POLICY calendar_attendees_tenant_policy ON calendar_attendees
  FOR ALL
  USING (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM calendar_events e
      WHERE e.id = calendar_attendees.event_id
        AND e.user_id = app_current_user_id()
    )
  )
  WITH CHECK (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM calendar_events e
      WHERE e.id = calendar_attendees.event_id
        AND e.user_id = app_current_user_id()
    )
  );

DROP POLICY IF EXISTS task_lists_tenant_policy ON task_lists;
CREATE POLICY task_lists_tenant_policy ON task_lists
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS tasks_tenant_policy ON tasks;
CREATE POLICY tasks_tenant_policy ON tasks
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS goals_tenant_policy ON goals;
CREATE POLICY goals_tenant_policy ON goals
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS key_results_tenant_policy ON key_results;
CREATE POLICY key_results_tenant_policy ON key_results
  FOR ALL
  USING (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = key_results.goal_id
        AND g.user_id = app_current_user_id()
    )
  )
  WITH CHECK (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM goals g
      WHERE g.id = key_results.goal_id
        AND g.user_id = app_current_user_id()
    )
  );

DROP POLICY IF EXISTS finance_categories_tenant_policy ON finance_categories;
CREATE POLICY finance_categories_tenant_policy ON finance_categories
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS finance_accounts_tenant_policy ON finance_accounts;
CREATE POLICY finance_accounts_tenant_policy ON finance_accounts
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS finance_transactions_tenant_policy ON finance_transactions;
CREATE POLICY finance_transactions_tenant_policy ON finance_transactions
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS places_tenant_policy ON places;
CREATE POLICY places_tenant_policy ON places
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS travel_trips_tenant_policy ON travel_trips;
CREATE POLICY travel_trips_tenant_policy ON travel_trips
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS travel_flights_tenant_policy ON travel_flights;
CREATE POLICY travel_flights_tenant_policy ON travel_flights
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS travel_hotels_tenant_policy ON travel_hotels;
CREATE POLICY travel_hotels_tenant_policy ON travel_hotels
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS career_companies_tenant_policy ON career_companies;
CREATE POLICY career_companies_tenant_policy ON career_companies
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS career_jobs_tenant_policy ON career_jobs;
CREATE POLICY career_jobs_tenant_policy ON career_jobs
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS career_applications_tenant_policy ON career_applications;
CREATE POLICY career_applications_tenant_policy ON career_applications
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS career_interviews_tenant_policy ON career_interviews;
CREATE POLICY career_interviews_tenant_policy ON career_interviews
  FOR ALL
  USING (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM career_applications a
      WHERE a.id = career_interviews.application_id
        AND a.user_id = app_current_user_id()
    )
  )
  WITH CHECK (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM career_applications a
      WHERE a.id = career_interviews.application_id
        AND a.user_id = app_current_user_id()
    )
  );

DROP POLICY IF EXISTS schools_tenant_policy ON schools;
CREATE POLICY schools_tenant_policy ON schools
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS notes_tenant_policy ON notes;
CREATE POLICY notes_tenant_policy ON notes
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS note_shares_select_policy ON note_shares;
CREATE POLICY note_shares_select_policy ON note_shares
  FOR SELECT
  USING (
    app_is_service_role()
    OR shared_with_user_id = app_current_user_id()
    OR EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_shares.note_id
        AND n.user_id = app_current_user_id()
    )
  );

DROP POLICY IF EXISTS note_shares_owner_write_policy ON note_shares;
CREATE POLICY note_shares_owner_write_policy ON note_shares
  FOR ALL
  USING (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_shares.note_id
        AND n.user_id = app_current_user_id()
    )
  )
  WITH CHECK (
    app_is_service_role() OR EXISTS (
      SELECT 1 FROM notes n
      WHERE n.id = note_shares.note_id
        AND n.user_id = app_current_user_id()
    )
  );

DROP POLICY IF EXISTS bookmarks_tenant_policy ON bookmarks;
CREATE POLICY bookmarks_tenant_policy ON bookmarks
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS logs_tenant_policy ON logs;
CREATE POLICY logs_tenant_policy ON logs
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS searches_tenant_policy ON searches;
CREATE POLICY searches_tenant_policy ON searches
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS possession_containers_tenant_policy ON possession_containers;
CREATE POLICY possession_containers_tenant_policy ON possession_containers
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

DROP POLICY IF EXISTS possessions_tenant_policy ON possessions;
CREATE POLICY possessions_tenant_policy ON possessions
  FOR ALL
  USING (app_is_service_role() OR user_id = app_current_user_id())
  WITH CHECK (app_is_service_role() OR user_id = app_current_user_id());

-- ============================================
-- SECURITY: Grants Bootstrap (migration-safe)
-- ============================================

-- Grants are wrapped in a DO block so migrations remain idempotent and tolerant
-- of environments where role administration is restricted.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
    GRANT EXECUTE ON FUNCTION app_current_user_id() TO app_user;
    GRANT EXECUTE ON FUNCTION app_is_service_role() TO app_user;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT USAGE, SELECT ON SEQUENCES TO app_user;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
    GRANT USAGE ON SCHEMA public TO app_service;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_service;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_service;
    GRANT EXECUTE ON FUNCTION app_current_user_id() TO app_service;
    GRANT EXECUTE ON FUNCTION app_is_service_role() TO app_service;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT ALL PRIVILEGES ON TABLES TO app_service;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
      GRANT ALL PRIVILEGES ON SEQUENCES TO app_service;
  END IF;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping grants bootstrap (insufficient privilege).';
END;
$$;

-- ============================================
-- SECURITY: RLS Verification Script (copy/paste)
-- ============================================

-- 1) App user should only see own rows.
-- BEGIN;
--   SET LOCAL ROLE app_user;
--   SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000001';
--   SET LOCAL app.is_service_role = 'false';
--
--   SELECT COUNT(*) AS visible_users FROM users;
--   SELECT COUNT(*) AS visible_tasks FROM tasks;
--   SELECT COUNT(*) AS visible_notes FROM notes;
-- COMMIT;

-- 2) App user should be blocked from cross-tenant writes.
-- BEGIN;
--   SET LOCAL ROLE app_user;
--   SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000001';
--   SET LOCAL app.is_service_role = 'false';
--
--   -- Expected: ERROR due to RLS WITH CHECK
--   INSERT INTO tasks (id, user_id, title)
--   VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', 'should fail');
-- ROLLBACK;

-- 3) Service role should bypass tenant filters when explicitly enabled.
-- BEGIN;
--   SET LOCAL ROLE app_service;
--   SET LOCAL app.current_user_id = '00000000-0000-0000-0000-000000000001';
--   SET LOCAL app.is_service_role = 'true';
--
--   SELECT COUNT(*) AS all_tasks_visible FROM tasks;
-- COMMIT;

-- ============================================
-- OPERATIONS: Partition Maintenance Automation
-- ============================================

-- Helper: create a range partition if it does not exist.
CREATE OR REPLACE FUNCTION ensure_range_partition(
  p_parent_table REGCLASS,
  p_child_table_name TEXT,
  p_from_value TEXT,
  p_to_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
    p_child_table_name,
    p_parent_table::TEXT,
    p_from_value,
    p_to_value
  );
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END;
$$;

-- Create future partitions for all large time-series tables.
-- Recommended schedule: run daily.
CREATE OR REPLACE FUNCTION ensure_future_partitions()
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  year_start INT;
  month_cursor DATE;
  month_end DATE;
  quarter_cursor DATE;
  quarter_end DATE;
  quarter_num INT;
  y INT;
BEGIN
  year_start := EXTRACT(YEAR FROM NOW())::INT;

  -- Yearly partitions: keep 1 year behind and 3 years ahead.
  FOR y IN (year_start - 1)..(year_start + 3) LOOP
    PERFORM ensure_range_partition('music_listening'::REGCLASS, 'music_listening_' || y, (y || '-01-01'), ((y + 1) || '-01-01'));
    PERFORM ensure_range_partition('video_viewings'::REGCLASS, 'video_viewings_' || y, (y || '-01-01'), ((y + 1) || '-01-01'));
    PERFORM ensure_range_partition('health_records'::REGCLASS, 'health_records_' || y, (y || '-01-01'), ((y + 1) || '-01-01'));
    PERFORM ensure_range_partition('finance_transactions'::REGCLASS, 'finance_transactions_' || y, (y || '-01-01'), ((y + 1) || '-01-01'));
  END LOOP;

  -- Monthly partitions for logs: keep 2 months behind and 18 months ahead.
  month_cursor := (date_trunc('month', now())::date - INTERVAL '2 months')::date;
  FOR y IN 1..21 LOOP
    month_end := (month_cursor + INTERVAL '1 month')::date;
    PERFORM ensure_range_partition(
      'logs'::REGCLASS,
      'logs_' || to_char(month_cursor, 'YYYY_MM'),
      to_char(month_cursor, 'YYYY-MM-DD'),
      to_char(month_end, 'YYYY-MM-DD')
    );
    month_cursor := month_end;
  END LOOP;

  -- Quarterly partitions for searches: keep previous quarter and next 8 quarters.
  quarter_cursor := (date_trunc('quarter', now())::date - INTERVAL '3 months')::date;
  FOR y IN 1..9 LOOP
    quarter_end := (quarter_cursor + INTERVAL '3 months')::date;
    quarter_num := EXTRACT(QUARTER FROM quarter_cursor)::INT;
    PERFORM ensure_range_partition(
      'searches'::REGCLASS,
      'searches_' || to_char(quarter_cursor, 'YYYY') || '_q' || quarter_num,
      to_char(quarter_cursor, 'YYYY-MM-DD'),
      to_char(quarter_end, 'YYYY-MM-DD')
    );
    quarter_cursor := quarter_end;
  END LOOP;
END;
$$;

-- Drop partitions that fully end before p_keep_from.
-- Dry run by default: returns DROP statements without executing.
CREATE OR REPLACE FUNCTION drop_old_range_partitions(
  p_parent_table REGCLASS,
  p_keep_from TIMESTAMPTZ,
  p_dry_run BOOLEAN DEFAULT true
)
RETURNS TABLE(partition_name TEXT, dropped BOOLEAN, ddl TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  part RECORD;
  to_value_text TEXT;
  to_value_ts TIMESTAMPTZ;
  drop_sql TEXT;
BEGIN
  FOR part IN
    SELECT
      c.oid::regclass AS child_regclass,
      c.relname AS child_name,
      pg_get_expr(c.relpartbound, c.oid, true) AS part_bound
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = p_parent_table
  LOOP
    -- Skip DEFAULT partitions (no TO bound).
    IF part.part_bound ILIKE '%DEFAULT%' THEN
      CONTINUE;
    END IF;

    to_value_text := substring(part.part_bound FROM 'TO \(''([^'']+)''\)');
    IF to_value_text IS NULL THEN
      CONTINUE;
    END IF;

    to_value_ts := to_value_text::timestamptz;
    IF to_value_ts <= p_keep_from THEN
      drop_sql := format('DROP TABLE IF EXISTS %s', part.child_regclass::TEXT);
      IF p_dry_run THEN
        RETURN QUERY SELECT part.child_name::TEXT, false, drop_sql;
      ELSE
        EXECUTE drop_sql;
        RETURN QUERY SELECT part.child_name::TEXT, true, drop_sql;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- One-shot runner for daily ops jobs.
-- p_retention_months applies to logs/searches partition cleanup.
CREATE OR REPLACE FUNCTION run_partition_maintenance(
  p_retention_months INT DEFAULT 18,
  p_drop_dry_run BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff TIMESTAMPTZ;
BEGIN
  PERFORM ensure_future_partitions();

  cutoff := date_trunc('month', now()) - make_interval(months => p_retention_months);

  -- High-volume event streams retention cleanup.
  PERFORM * FROM drop_old_range_partitions('logs'::REGCLASS, cutoff, p_drop_dry_run);
  PERFORM * FROM drop_old_range_partitions('searches'::REGCLASS, cutoff, p_drop_dry_run);
END;
$$;

-- Suggested operational calls:
--   SELECT ensure_future_partitions();
--   SELECT * FROM drop_old_range_partitions('logs'::REGCLASS, now() - interval '18 months', true);
--   SELECT run_partition_maintenance(18, true);   -- dry-run cleanup
--   SELECT run_partition_maintenance(18, false);  -- execute cleanup

-- ============================================
-- OPERATIONS: Partition Audit & Monitoring
-- ============================================

-- Returns one row per partition with parsed [from, to) bounds where available.
CREATE OR REPLACE FUNCTION partition_bounds(p_parent_table REGCLASS)
RETURNS TABLE(
  parent_table TEXT,
  partition_name TEXT,
  is_default BOOLEAN,
  from_value TIMESTAMPTZ,
  to_value TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    p_parent_table::TEXT AS parent_table,
    c.relname::TEXT AS partition_name,
    (pg_get_expr(c.relpartbound, c.oid, true) ILIKE '%DEFAULT%') AS is_default,
    NULLIF(substring(pg_get_expr(c.relpartbound, c.oid, true) FROM 'FROM \(''([^'']+)''\)'), '')::timestamptz AS from_value,
    NULLIF(substring(pg_get_expr(c.relpartbound, c.oid, true) FROM 'TO \(''([^'']+)''\)'), '')::timestamptz AS to_value
  FROM pg_inherits i
  JOIN pg_class c ON c.oid = i.inhrelid
  WHERE i.inhparent = p_parent_table
$$;

-- Reports whether there is enough future partition coverage.
CREATE OR REPLACE FUNCTION partition_future_coverage(
  p_parent_table REGCLASS,
  p_required_horizon INTERVAL
)
RETURNS TABLE(
  parent_table TEXT,
  required_until TIMESTAMPTZ,
  max_partition_to TIMESTAMPTZ,
  has_coverage BOOLEAN,
  gap_interval INTERVAL
)
LANGUAGE SQL
STABLE
AS $$
  WITH max_to AS (
    SELECT MAX(to_value) AS max_partition_to
    FROM partition_bounds(p_parent_table)
    WHERE is_default = false
  )
  SELECT
    p_parent_table::TEXT AS parent_table,
    (now() + p_required_horizon) AS required_until,
    m.max_partition_to,
    (m.max_partition_to IS NOT NULL AND m.max_partition_to >= (now() + p_required_horizon)) AS has_coverage,
    CASE
      WHEN m.max_partition_to IS NULL THEN p_required_horizon
      WHEN m.max_partition_to >= (now() + p_required_horizon) THEN interval '0'
      ELSE (now() + p_required_horizon) - m.max_partition_to
    END AS gap_interval
  FROM max_to m
$$;

-- Counts records currently spilling into each DEFAULT partition.
CREATE OR REPLACE FUNCTION default_partition_spill_rows()
RETURNS TABLE(
  parent_table TEXT,
  default_partition TEXT,
  spill_row_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  rec RECORD;
  count_sql TEXT;
  row_count BIGINT;
BEGIN
  FOR rec IN
    SELECT
      parent_table,
      partition_name
    FROM (
      SELECT * FROM partition_bounds('music_listening'::regclass)
      UNION ALL SELECT * FROM partition_bounds('video_viewings'::regclass)
      UNION ALL SELECT * FROM partition_bounds('health_records'::regclass)
      UNION ALL SELECT * FROM partition_bounds('finance_transactions'::regclass)
      UNION ALL SELECT * FROM partition_bounds('logs'::regclass)
      UNION ALL SELECT * FROM partition_bounds('searches'::regclass)
    ) b
    WHERE b.is_default = true
  LOOP
    count_sql := format('SELECT count(*)::bigint FROM %I', rec.partition_name);
    EXECUTE count_sql INTO row_count;
    RETURN QUERY SELECT rec.parent_table, rec.partition_name, row_count;
  END LOOP;
END;
$$;

-- Single-pane audit view for partition operations dashboards.
CREATE OR REPLACE VIEW partition_audit AS
WITH
  coverage AS (
    SELECT * FROM partition_future_coverage('music_listening'::regclass, interval '12 months')
    UNION ALL SELECT * FROM partition_future_coverage('video_viewings'::regclass, interval '12 months')
    UNION ALL SELECT * FROM partition_future_coverage('health_records'::regclass, interval '12 months')
    UNION ALL SELECT * FROM partition_future_coverage('finance_transactions'::regclass, interval '12 months')
    UNION ALL SELECT * FROM partition_future_coverage('logs'::regclass, interval '6 months')
    UNION ALL SELECT * FROM partition_future_coverage('searches'::regclass, interval '9 months')
  ),
  spill AS (
    SELECT * FROM default_partition_spill_rows()
  ),
  retention AS (
    SELECT
      'logs'::TEXT AS parent_table,
      COALESCE((SELECT MIN(from_value) FROM partition_bounds('logs'::regclass) WHERE is_default = false), NULL) AS oldest_partition_from,
      (date_trunc('month', now()) - interval '18 months') AS retention_cutoff
    UNION ALL
    SELECT
      'searches'::TEXT AS parent_table,
      COALESCE((SELECT MIN(from_value) FROM partition_bounds('searches'::regclass) WHERE is_default = false), NULL) AS oldest_partition_from,
      (date_trunc('month', now()) - interval '18 months') AS retention_cutoff
  )
SELECT
  c.parent_table,
  c.required_until,
  c.max_partition_to,
  c.has_coverage,
  c.gap_interval,
  COALESCE(s.spill_row_count, 0) AS default_partition_spill_row_count,
  r.oldest_partition_from,
  r.retention_cutoff,
  CASE
    WHEN r.oldest_partition_from IS NULL THEN false
    WHEN r.oldest_partition_from < r.retention_cutoff THEN true
    ELSE false
  END AS retention_violation
FROM coverage c
LEFT JOIN spill s ON s.parent_table = c.parent_table
LEFT JOIN retention r ON r.parent_table = c.parent_table;

-- Suggested audit calls:
--   SELECT * FROM partition_audit ORDER BY parent_table;
--   SELECT * FROM partition_audit WHERE has_coverage = false OR default_partition_spill_row_count > 0 OR retention_violation = true;