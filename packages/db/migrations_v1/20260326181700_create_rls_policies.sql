-- +goose Up
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
ALTER TABLE app.note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.note_tags FORCE ROW LEVEL SECURITY;
ALTER TABLE app.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chats FORCE ROW LEVEL SECURITY;
ALTER TABLE app.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.chat_messages FORCE ROW LEVEL SECURITY;
ALTER TABLE app.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.people FORCE ROW LEVEL SECURITY;
ALTER TABLE app.person_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.person_relationships FORCE ROW LEVEL SECURITY;
ALTER TABLE app.task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_lists FORCE ROW LEVEL SECURITY;
ALTER TABLE app.task_list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_list_members FORCE ROW LEVEL SECURITY;
ALTER TABLE app.task_list_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_list_invites FORCE ROW LEVEL SECURITY;
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
ALTER TABLE app.travel_flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.travel_flights FORCE ROW LEVEL SECURITY;
ALTER TABLE app.travel_hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.travel_hotels FORCE ROW LEVEL SECURITY;
ALTER TABLE app.finance_institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_institutions FORCE ROW LEVEL SECURITY;
ALTER TABLE app.finance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_categories FORCE ROW LEVEL SECURITY;
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
ALTER TABLE app.music_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_likes FORCE ROW LEVEL SECURITY;
ALTER TABLE app.video_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.video_channels FORCE ROW LEVEL SECURITY;
ALTER TABLE app.video_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.video_subscriptions FORCE ROW LEVEL SECURITY;
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
ALTER TABLE ops.schema_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ops.schema_jobs FORCE ROW LEVEL SECURITY;

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
    OR EXISTS (
      SELECT 1
      FROM app.note_shares shares
      WHERE shares.note_id = notes.id
        AND shares.shared_with_user_id = auth.current_user_id()
    )
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
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.notes note
      WHERE note.id = note_versions.note_id
        AND (
          note.owner_user_id = auth.current_user_id()
          OR EXISTS (
            SELECT 1
            FROM app.note_shares shares
            WHERE shares.note_id = note.id
              AND shares.shared_with_user_id = auth.current_user_id()
          )
        )
    )
  );

CREATE POLICY app_note_versions_owner_write_policy ON app.note_versions
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.notes note
      WHERE note.id = note_versions.note_id
        AND note.owner_user_id = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.notes note
      WHERE note.id = note_versions.note_id
        AND note.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_note_shares_select_policy ON app.note_shares
  FOR SELECT
  USING (
    auth.is_service_role()
    OR shared_with_user_id = auth.current_user_id()
    OR EXISTS (
      SELECT 1
      FROM app.notes note
      WHERE note.id = note_shares.note_id
        AND note.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_note_shares_owner_write_policy ON app.note_shares
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.notes note
      WHERE note.id = note_shares.note_id
        AND note.owner_user_id = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.notes note
      WHERE note.id = note_shares.note_id
        AND note.owner_user_id = auth.current_user_id()
    )
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

CREATE POLICY app_note_tags_select_policy ON app.note_tags
  FOR SELECT
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.notes note
      WHERE note.id = note_tags.note_id
        AND (
          note.owner_user_id = auth.current_user_id()
          OR EXISTS (
            SELECT 1
            FROM app.note_shares shares
            WHERE shares.note_id = note.id
              AND shares.shared_with_user_id = auth.current_user_id()
          )
        )
    )
  );

CREATE POLICY app_note_tags_owner_write_policy ON app.note_tags
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.notes note
      WHERE note.id = note_tags.note_id
        AND note.owner_user_id = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.notes note
      WHERE note.id = note_tags.note_id
        AND note.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_chats_owner_policy ON app.chats
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_chat_messages_owner_policy ON app.chat_messages
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND chat.owner_user_id = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.chats chat
      WHERE chat.id = chat_messages.chat_id
        AND chat.owner_user_id = auth.current_user_id()
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

CREATE POLICY app_person_relationships_owner_policy ON app.person_relationships
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_task_lists_select_policy ON app.task_lists
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
    OR EXISTS (
      SELECT 1
      FROM app.task_list_members member
      WHERE member.list_id = task_lists.id
        AND member.user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_task_lists_owner_write_policy ON app.task_lists
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_task_list_members_select_policy ON app.task_list_members
  FOR SELECT
  USING (
    auth.is_service_role()
    OR user_id = auth.current_user_id()
    OR EXISTS (
      SELECT 1
      FROM app.task_lists list
      WHERE list.id = task_list_members.list_id
        AND list.owner_user_id = auth.current_user_id()
    )
    OR EXISTS (
      SELECT 1
      FROM app.task_list_members member
      WHERE member.list_id = task_list_members.list_id
        AND member.user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_task_list_members_owner_write_policy ON app.task_list_members
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.task_lists list
      WHERE list.id = task_list_members.list_id
        AND list.owner_user_id = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.task_lists list
      WHERE list.id = task_list_members.list_id
        AND list.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_task_list_invites_select_policy ON app.task_list_invites
  FOR SELECT
  USING (
    auth.is_service_role()
    OR inviter_user_id = auth.current_user_id()
    OR invited_user_id = auth.current_user_id()
    OR EXISTS (
      SELECT 1
      FROM app.task_lists list
      WHERE list.id = task_list_invites.list_id
        AND list.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_task_list_invites_owner_write_policy ON app.task_list_invites
  FOR ALL
  USING (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.task_lists list
      WHERE list.id = task_list_invites.list_id
        AND list.owner_user_id = auth.current_user_id()
    )
  )
  WITH CHECK (
    auth.is_service_role()
    OR EXISTS (
      SELECT 1
      FROM app.task_lists list
      WHERE list.id = task_list_invites.list_id
        AND list.owner_user_id = auth.current_user_id()
    )
  );

CREATE POLICY app_tasks_select_policy ON app.tasks
  FOR SELECT
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
    OR (
      list_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM app.task_list_members member
        WHERE member.list_id = tasks.list_id
          AND member.user_id = auth.current_user_id()
      )
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

CREATE POLICY app_travel_flights_owner_policy ON app.travel_flights
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

CREATE POLICY app_travel_hotels_owner_policy ON app.travel_hotels
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

CREATE POLICY app_finance_categories_owner_policy ON app.finance_categories
  FOR ALL
  USING (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  )
  WITH CHECK (
    auth.is_service_role()
    OR owner_user_id = auth.current_user_id()
  );

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

CREATE POLICY app_music_likes_owner_policy ON app.music_likes
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

CREATE POLICY app_video_subscriptions_owner_policy ON app.video_subscriptions
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

CREATE POLICY ops_schema_jobs_service_policy ON ops.schema_jobs
  FOR ALL
  USING (auth.is_service_role())
  WITH CHECK (auth.is_service_role());

-- +goose Down
DROP POLICY IF EXISTS ops_schema_jobs_service_policy ON ops.schema_jobs;
DROP POLICY IF EXISTS ops_search_logs_service_policy ON ops.search_logs;
DROP POLICY IF EXISTS ops_audit_logs_service_policy ON ops.audit_logs;
DROP POLICY IF EXISTS app_possession_events_owner_policy ON app.possession_events;
DROP POLICY IF EXISTS app_possessions_owner_policy ON app.possessions;
DROP POLICY IF EXISTS app_possession_containers_owner_policy ON app.possession_containers;
DROP POLICY IF EXISTS app_video_views_owner_policy ON app.video_views;
DROP POLICY IF EXISTS app_video_subscriptions_owner_policy ON app.video_subscriptions;
DROP POLICY IF EXISTS app_video_channels_owner_policy ON app.video_channels;
DROP POLICY IF EXISTS app_music_likes_owner_policy ON app.music_likes;
DROP POLICY IF EXISTS app_music_listens_owner_policy ON app.music_listens;
DROP POLICY IF EXISTS app_music_playlist_tracks_owner_policy ON app.music_playlist_tracks;
DROP POLICY IF EXISTS app_music_playlists_owner_policy ON app.music_playlists;
DROP POLICY IF EXISTS app_music_tracks_owner_policy ON app.music_tracks;
DROP POLICY IF EXISTS app_music_albums_owner_policy ON app.music_albums;
DROP POLICY IF EXISTS app_music_artists_owner_policy ON app.music_artists;
DROP POLICY IF EXISTS app_finance_transactions_owner_policy ON app.finance_transactions;
DROP POLICY IF EXISTS app_finance_accounts_owner_policy ON app.finance_accounts;
DROP POLICY IF EXISTS app_plaid_items_owner_policy ON app.plaid_items;
DROP POLICY IF EXISTS app_finance_categories_owner_policy ON app.finance_categories;
DROP POLICY IF EXISTS app_finance_institutions_service_write_policy ON app.finance_institutions;
DROP POLICY IF EXISTS app_finance_institutions_select_policy ON app.finance_institutions;
DROP POLICY IF EXISTS app_travel_hotels_owner_policy ON app.travel_hotels;
DROP POLICY IF EXISTS app_travel_flights_owner_policy ON app.travel_flights;
DROP POLICY IF EXISTS app_travel_trips_owner_policy ON app.travel_trips;
DROP POLICY IF EXISTS app_calendar_attendees_owner_policy ON app.calendar_attendees;
DROP POLICY IF EXISTS app_calendar_events_owner_policy ON app.calendar_events;
DROP POLICY IF EXISTS app_bookmarks_owner_policy ON app.bookmarks;
DROP POLICY IF EXISTS app_places_owner_policy ON app.places;
DROP POLICY IF EXISTS app_key_results_owner_policy ON app.key_results;
DROP POLICY IF EXISTS app_goals_owner_policy ON app.goals;
DROP POLICY IF EXISTS app_tasks_owner_write_policy ON app.tasks;
DROP POLICY IF EXISTS app_tasks_select_policy ON app.tasks;
DROP POLICY IF EXISTS app_task_list_invites_owner_write_policy ON app.task_list_invites;
DROP POLICY IF EXISTS app_task_list_invites_select_policy ON app.task_list_invites;
DROP POLICY IF EXISTS app_task_list_members_owner_write_policy ON app.task_list_members;
DROP POLICY IF EXISTS app_task_list_members_select_policy ON app.task_list_members;
DROP POLICY IF EXISTS app_task_lists_owner_write_policy ON app.task_lists;
DROP POLICY IF EXISTS app_task_lists_select_policy ON app.task_lists;
DROP POLICY IF EXISTS app_person_relationships_owner_policy ON app.person_relationships;
DROP POLICY IF EXISTS app_people_owner_policy ON app.people;
DROP POLICY IF EXISTS app_chat_messages_owner_policy ON app.chat_messages;
DROP POLICY IF EXISTS app_chats_owner_policy ON app.chats;
DROP POLICY IF EXISTS app_note_tags_owner_write_policy ON app.note_tags;
DROP POLICY IF EXISTS app_note_tags_select_policy ON app.note_tags;
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

ALTER TABLE ops.schema_jobs NO FORCE ROW LEVEL SECURITY;
ALTER TABLE ops.schema_jobs DISABLE ROW LEVEL SECURITY;
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
ALTER TABLE app.video_subscriptions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.video_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.video_channels NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.video_channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.music_likes NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.music_likes DISABLE ROW LEVEL SECURITY;
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
ALTER TABLE app.finance_categories NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.finance_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.finance_institutions NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.finance_institutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.travel_hotels NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.travel_hotels DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.travel_flights NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.travel_flights DISABLE ROW LEVEL SECURITY;
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
ALTER TABLE app.task_list_invites NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.task_list_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_list_members NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.task_list_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.task_lists NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.task_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.person_relationships NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.person_relationships DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.people NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.people DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.chat_messages NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.chats NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE app.note_tags NO FORCE ROW LEVEL SECURITY;
ALTER TABLE app.note_tags DISABLE ROW LEVEL SECURITY;
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
