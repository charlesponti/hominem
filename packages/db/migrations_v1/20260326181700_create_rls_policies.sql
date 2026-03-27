-- +goose Up
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.can_read_note(target_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.notes note
    WHERE note.id = target_note_id
      AND (
        auth.is_service_role()
        OR note.owner_user_id = auth.current_user_id()
        OR EXISTS (
          SELECT 1
          FROM app.note_shares share
          WHERE share.note_id = note.id
            AND share.shared_with_user_id = auth.current_user_id()
        )
      )
  )
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.can_write_note(target_note_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.notes note
    WHERE note.id = target_note_id
      AND (
        auth.is_service_role()
        OR note.owner_user_id = auth.current_user_id()
      )
  )
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.owns_space(target_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.spaces space
    WHERE space.id = target_space_id
      AND (
        auth.is_service_role()
        OR space.owner_user_id = auth.current_user_id()
      )
  )
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION auth.is_space_member(target_space_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = auth, app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.space_members member
    WHERE member.space_id = target_space_id
      AND (
        auth.is_service_role()
        OR member.user_id = auth.current_user_id()
      )
  )
$$;
-- +goose StatementEnd

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.identities FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.passkeys FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.verification_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.device_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.device_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.api_keys FORCE ROW LEVEL SECURITY;

ALTER TABLE app.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.notes FORCE ROW LEVEL SECURITY;
ALTER TABLE app.note_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.note_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE app.note_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.note_shares FORCE ROW LEVEL SECURITY;
ALTER TABLE app.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tags FORCE ROW LEVEL SECURITY;
ALTER TABLE app.tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tag_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE app.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chats FORCE ROW LEVEL SECURITY;
ALTER TABLE app.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chat_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE app.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.people FORCE ROW LEVEL SECURITY;
ALTER TABLE app.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.spaces FORCE ROW LEVEL SECURITY;
ALTER TABLE app.space_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.space_members FORCE ROW LEVEL SECURITY;
ALTER TABLE app.space_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.space_invites FORCE ROW LEVEL SECURITY;
ALTER TABLE app.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE app.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.goals FORCE ROW LEVEL SECURITY;
ALTER TABLE app.key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.key_results FORCE ROW LEVEL SECURITY;
ALTER TABLE app.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.places FORCE ROW LEVEL SECURITY;
ALTER TABLE app.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.bookmarks FORCE ROW LEVEL SECURITY;
ALTER TABLE app.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.calendar_events FORCE ROW LEVEL SECURITY;
ALTER TABLE app.calendar_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.calendar_attendees FORCE ROW LEVEL SECURITY;
ALTER TABLE app.travel_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.travel_trips FORCE ROW LEVEL SECURITY;
ALTER TABLE app.finance_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_institutions FORCE ROW LEVEL SECURITY;
ALTER TABLE app.plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.plaid_items FORCE ROW LEVEL SECURITY;
ALTER TABLE app.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE app.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_transactions FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_artists FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_albums FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_tracks FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_playlists FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_playlist_tracks FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_listens ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_listens FORCE ROW LEVEL SECURITY;
ALTER TABLE app.video_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.video_channels FORCE ROW LEVEL SECURITY;
ALTER TABLE app.video_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.video_views FORCE ROW LEVEL SECURITY;
ALTER TABLE app.possession_containers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.possession_containers FORCE ROW LEVEL SECURITY;
ALTER TABLE app.possessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.possessions FORCE ROW LEVEL SECURITY;
ALTER TABLE app.possession_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.possession_events FORCE ROW LEVEL SECURITY;

ALTER TABLE ops.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.search_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY auth_users_service_policy ON auth.users
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY auth_users_self_select_policy ON auth.users
  FOR SELECT
  USING (id = auth.current_user_id());

CREATE POLICY auth_users_self_update_policy ON auth.users
  FOR UPDATE
  USING (id = auth.current_user_id())
  WITH CHECK (id = auth.current_user_id());

CREATE POLICY auth_identities_service_policy ON auth.identities
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY auth_sessions_service_policy ON auth.sessions
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY auth_refresh_tokens_service_policy ON auth.refresh_tokens
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY auth_passkeys_service_policy ON auth.passkeys
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY auth_verification_tokens_service_policy ON auth.verification_tokens
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY auth_device_codes_service_policy ON auth.device_codes
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY auth_api_keys_service_policy ON auth.api_keys
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY app_notes_select_policy ON app.notes
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
    OR auth.can_read_note(id)
  );

CREATE POLICY app_notes_owner_write_policy ON app.notes
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_note_versions_select_policy ON app.note_versions
  FOR SELECT
  USING (
    auth.can_read_note(note_id)
  );

CREATE POLICY app_note_versions_owner_write_policy ON app.note_versions
  FOR ALL
  USING (
    auth.can_write_note(note_id)
  )
  WITH CHECK (
    auth.can_write_note(note_id)
  );

CREATE POLICY app_note_shares_select_policy ON app.note_shares
  FOR SELECT
  USING (
    auth.is_service_role()
    OR shared_with_user_id = auth.current_user_id()
    OR auth.can_write_note(note_id)
  );

CREATE POLICY app_note_shares_owner_write_policy ON app.note_shares
  FOR ALL
  USING (
    auth.can_write_note(note_id)
  )
  WITH CHECK (
    auth.can_write_note(note_id)
  );

CREATE POLICY app_tags_owner_policy ON app.tags
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_tag_assignments_select_policy ON app.tag_assignments
  FOR SELECT
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.tags tag
      WHERE tag.id = tag_assignments.tag_id
        AND tag.owner_user_id = auth.current_user_id()
    )
    OR (
      entity_type = 'note'
      AND auth.can_read_note(entity_id)
    )
  );

CREATE POLICY app_tag_assignments_owner_write_policy ON app.tag_assignments
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.tags tag
      WHERE tag.id = tag_assignments.tag_id
        AND tag.owner_user_id = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.tags tag
      WHERE tag.id = tag_assignments.tag_id
        AND tag.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_chats_owner_policy ON app.chats
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
    OR (
      space_id IS NOT NULL
      AND auth.is_space_member(space_id)
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
    OR (
      space_id IS NOT NULL
      AND auth.is_space_member(space_id)
    )
  );

CREATE POLICY app_chat_messages_owner_policy ON app.chat_messages
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND (
          chat.owner_user_id = auth.current_user_id()
          OR (
            chat.space_id IS NOT NULL
            AND auth.is_space_member(chat.space_id)
          )
        )
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND (
          chat.owner_user_id = auth.current_user_id()
          OR (
            chat.space_id IS NOT NULL
            AND auth.is_space_member(chat.space_id)
          )
        )
    )
  );

CREATE POLICY app_people_owner_policy ON app.people
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_spaces_select_policy ON app.spaces
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
    OR auth.is_space_member(id)
  );

CREATE POLICY app_spaces_owner_write_policy ON app.spaces
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_space_members_select_policy ON app.space_members
  FOR SELECT
  USING (
    auth.is_service_role()
    OR user_id = auth.current_user_id()
    OR auth.owns_space(space_id)
  );

CREATE POLICY app_space_members_owner_write_policy ON app.space_members
  FOR ALL
  USING (
    auth.owns_space(space_id)
  )
  WITH CHECK (
    auth.owns_space(space_id)
  );

CREATE POLICY app_space_invites_select_policy ON app.space_invites
  FOR SELECT
  USING (
    auth.is_service_role()
    OR inviter_user_id = auth.current_user_id()
    OR invited_user_id = auth.current_user_id()
    OR auth.owns_space(space_id)
  );

CREATE POLICY app_space_invites_owner_write_policy ON app.space_invites
  FOR ALL
  USING (
    auth.owns_space(space_id)
  )
  WITH CHECK (
    auth.owns_space(space_id)
  );

CREATE POLICY app_tasks_select_policy ON app.tasks
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
    OR (
      space_id IS NOT NULL
      AND auth.is_space_member(space_id)
    )
  );

CREATE POLICY app_tasks_owner_write_policy ON app.tasks
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_goals_owner_policy ON app.goals
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_key_results_owner_policy ON app.key_results
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.goals goal
      WHERE goal.id = key_results.goal_id
        AND goal.owner_user_id = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.goals goal
      WHERE goal.id = key_results.goal_id
        AND goal.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_places_owner_policy ON app.places
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_bookmarks_owner_policy ON app.bookmarks
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_calendar_events_owner_policy ON app.calendar_events
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_calendar_attendees_owner_policy ON app.calendar_attendees
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.calendar_events event
      WHERE event.id = calendar_attendees.event_id
        AND event.owner_user_id = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.calendar_events event
      WHERE event.id = calendar_attendees.event_id
        AND event.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_travel_trips_owner_policy ON app.travel_trips
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_finance_institutions_select_policy ON app.finance_institutions
  FOR SELECT
  USING (
    auth.is_service_role()
    OR auth.current_user_id() IS NOT NULL
  );

CREATE POLICY app_finance_institutions_service_write_policy ON app.finance_institutions
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY app_plaid_items_owner_policy ON app.plaid_items
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_finance_accounts_owner_policy ON app.finance_accounts
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_finance_transactions_owner_policy ON app.finance_transactions
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_music_artists_owner_policy ON app.music_artists
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_music_albums_owner_policy ON app.music_albums
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_music_tracks_owner_policy ON app.music_tracks
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_music_playlists_owner_policy ON app.music_playlists
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_music_playlist_tracks_owner_policy ON app.music_playlist_tracks
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.music_playlists playlist
      WHERE playlist.id = music_playlist_tracks.playlist_id
        AND playlist.owner_user_id = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.music_playlists playlist
      WHERE playlist.id = music_playlist_tracks.playlist_id
        AND playlist.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_music_listens_owner_policy ON app.music_listens
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_video_channels_owner_policy ON app.video_channels
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_video_views_owner_policy ON app.video_views
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_possession_containers_owner_policy ON app.possession_containers
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_possessions_owner_policy ON app.possessions
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_possession_events_owner_policy ON app.possession_events
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY ops_audit_logs_service_policy ON ops.audit_logs
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

CREATE POLICY ops_search_logs_service_policy ON ops.search_logs
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- +goose Down
DROP POLICY IF EXISTS ops_search_logs_service_policy ON ops.search_logs;
DROP POLICY IF EXISTS ops_audit_logs_service_policy ON ops.audit_logs;
DROP POLICY IF EXISTS app_possession_events_owner_policy ON app.possession_events;
DROP POLICY IF EXISTS app_possessions_owner_policy ON app.possessions;
DROP POLICY IF EXISTS app_possession_containers_owner_policy ON app.possession_containers;
DROP POLICY IF EXISTS app_video_views_owner_policy ON app.video_views;
DROP POLICY IF EXISTS app_video_channels_owner_policy ON app.video_channels;
DROP POLICY IF EXISTS app_music_listens_owner_policy ON app.music_listens;
DROP POLICY IF EXISTS app_music_playlist_tracks_owner_policy ON app.music_playlist_tracks;
DROP POLICY IF EXISTS app_music_playlists_owner_policy ON app.music_playlists;
DROP POLICY IF EXISTS app_music_tracks_owner_policy ON app.music_tracks;
DROP POLICY IF EXISTS app_music_albums_owner_policy ON app.music_albums;
DROP POLICY IF EXISTS app_music_artists_owner_policy ON app.music_artists;
DROP POLICY IF EXISTS app_finance_transactions_owner_policy ON app.finance_transactions;
DROP POLICY IF EXISTS app_finance_accounts_owner_policy ON app.finance_accounts;
DROP POLICY IF EXISTS app_plaid_items_owner_policy ON app.plaid_items;
DROP POLICY IF EXISTS app_finance_institutions_service_write_policy ON app.finance_institutions;
DROP POLICY IF EXISTS app_finance_institutions_select_policy ON app.finance_institutions;
DROP POLICY IF EXISTS app_travel_trips_owner_policy ON app.travel_trips;
DROP POLICY IF EXISTS app_calendar_attendees_owner_policy ON app.calendar_attendees;
DROP POLICY IF EXISTS app_calendar_events_owner_policy ON app.calendar_events;
DROP POLICY IF EXISTS app_bookmarks_owner_policy ON app.bookmarks;
DROP POLICY IF EXISTS app_places_owner_policy ON app.places;
DROP POLICY IF EXISTS app_key_results_owner_policy ON app.key_results;
DROP POLICY IF EXISTS app_goals_owner_policy ON app.goals;
DROP POLICY IF EXISTS app_tasks_owner_write_policy ON app.tasks;
DROP POLICY IF EXISTS app_tasks_select_policy ON app.tasks;
DROP POLICY IF EXISTS app_space_invites_owner_write_policy ON app.space_invites;
DROP POLICY IF EXISTS app_space_invites_select_policy ON app.space_invites;
DROP POLICY IF EXISTS app_space_members_owner_write_policy ON app.space_members;
DROP POLICY IF EXISTS app_space_members_select_policy ON app.space_members;
DROP POLICY IF EXISTS app_spaces_owner_write_policy ON app.spaces;
DROP POLICY IF EXISTS app_spaces_select_policy ON app.spaces;
DROP POLICY IF EXISTS app_people_owner_policy ON app.people;
DROP POLICY IF EXISTS app_chat_messages_owner_policy ON app.chat_messages;
DROP POLICY IF EXISTS app_chats_owner_policy ON app.chats;
DROP POLICY IF EXISTS app_tag_assignments_owner_write_policy ON app.tag_assignments;
DROP POLICY IF EXISTS app_tag_assignments_select_policy ON app.tag_assignments;
DROP POLICY IF EXISTS app_tags_owner_policy ON app.tags;
DROP POLICY IF EXISTS app_note_shares_owner_write_policy ON app.note_shares;
DROP POLICY IF EXISTS app_note_shares_select_policy ON app.note_shares;
DROP POLICY IF EXISTS app_note_versions_owner_write_policy ON app.note_versions;
DROP POLICY IF EXISTS app_note_versions_select_policy ON app.note_versions;
DROP POLICY IF EXISTS app_notes_owner_write_policy ON app.notes;
DROP POLICY IF EXISTS app_notes_select_policy ON app.notes;
DROP POLICY IF EXISTS auth_api_keys_service_policy ON auth.api_keys;
DROP POLICY IF EXISTS auth_device_codes_service_policy ON auth.device_codes;
DROP POLICY IF EXISTS auth_verification_tokens_service_policy ON auth.verification_tokens;
DROP POLICY IF EXISTS auth_passkeys_service_policy ON auth.passkeys;
DROP POLICY IF EXISTS auth_refresh_tokens_service_policy ON auth.refresh_tokens;
DROP POLICY IF EXISTS auth_sessions_service_policy ON auth.sessions;
DROP POLICY IF EXISTS auth_identities_service_policy ON auth.identities;
DROP POLICY IF EXISTS auth_users_self_update_policy ON auth.users;
DROP POLICY IF EXISTS auth_users_self_select_policy ON auth.users;
DROP POLICY IF EXISTS auth_users_service_policy ON auth.users;

DROP FUNCTION IF EXISTS auth.is_space_member(uuid);
DROP FUNCTION IF EXISTS auth.owns_space(uuid);
DROP FUNCTION IF EXISTS auth.can_write_note(uuid);
DROP FUNCTION IF EXISTS auth.can_read_note(uuid);

ALTER TABLE ops.search_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.search_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE ops.audit_logs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.audit_logs DISABLE ROW LEVEL SECURITY;

ALTER TABLE app.possession_events NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.possession_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.possessions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.possessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.possession_containers NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.possession_containers DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.video_views NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.video_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.video_channels NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.video_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_listens NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_listens DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_playlist_tracks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_playlist_tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_playlists NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_playlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_tracks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_tracks DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_albums NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_albums DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_artists NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_artists DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_transactions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.finance_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_accounts NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.finance_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.plaid_items NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.plaid_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_institutions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.finance_institutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.travel_trips NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.travel_trips DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.calendar_attendees NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.calendar_attendees DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.calendar_events NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.calendar_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.bookmarks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.bookmarks DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.places NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.places DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.key_results NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.key_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.goals NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.tasks NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.space_invites NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.space_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.space_members NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.space_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.spaces NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.spaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.people NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.people DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.chat_messages NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.chats NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.tag_assignments NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.tag_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.tags NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.tags DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.note_shares NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.note_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.note_versions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.note_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.notes NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.notes DISABLE ROW LEVEL SECURITY;

ALTER TABLE auth.api_keys NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.api_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.device_codes NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.device_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.verification_tokens NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.verification_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.passkeys NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.passkeys DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.refresh_tokens DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.identities NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.identities DISABLE ROW LEVEL SECURITY;
ALTER TABLE auth.users NO FORCE ROW LEVEL SECURITY;
ALTER TABLE auth.users DISABLE ROW LEVEL SECURITY;
