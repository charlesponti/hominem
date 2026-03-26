# Database V1 Implementation Plan

## Goal

Turn [docs/database-v1-blueprint.md](/Users/charlesponti/Developer/hominem/docs/database-v1-blueprint.md) into an executable Goose migration plan for the first clean baseline.

This document answers three questions:

1. what we build first
2. how current baseline tables map into the new design
3. what is explicitly out of scope for V1

## Working Assumptions

- there is no production database
- there is no user data to migrate
- we are free to replace the dump baseline entirely
- we still want a staged rollout in the repo so the clean baseline is reviewable

## Deliverables

The clean baseline should be built as a short sequence of foundational Goose migrations rather than one giant dump.

Recommended first sequence:

1. `create_core_schemas`
2. `install_required_extensions`
3. `create_shared_functions`
4. `create_auth_tables`
5. `create_auth_indexes_and_constraints`
6. `create_app_notes_tables`
7. `create_app_people_tables`
8. `create_app_tasks_tables`
9. `create_app_places_calendar_travel_tables`
10. `create_app_finance_tables`
11. `create_app_media_tables`
12. `create_app_inventory_tables`
13. `create_ops_tables`
14. `create_rls_policies`
15. `create_search_and_supporting_indexes`

## Batch Plan

### Batch 1: Core Schemas

Create:

- `auth`
- `app`
- `ops`

Do not create tenant data in `public`.

### Batch 2: Extensions

Start with:

- `pgcrypto`
- `pg_trgm`
- `unaccent`

Optional:

- `postgis`
- `vector`

Do not install speculative extensions.

### Batch 3: Shared Functions

Create only:

- `set_updated_at()`
- auth-context helpers used by RLS

Do not include partition management, retention automation, or view-based partition audits in the first baseline.

### Batch 4: Auth

Create:

- `auth.users`
- `auth.identities`
- `auth.sessions`
- `auth.refresh_tokens`
- `auth.passkeys`
- `auth.verification_tokens`
- `auth.device_codes`
- `auth.api_keys`

Required invariants:

- case-insensitive unique email
- unique provider subject
- unique provider account identity when present
- unique session token hash
- unique refresh token hash
- unique credential id
- unique device code and user code
- non-null `created_at`
- non-null `updated_at` on mutable tables

### Batch 5: Notes And Chat

Create:

- `app.notes`
- `app.note_versions`
- `app.note_shares`
- `app.tags`
- `app.note_tags`
- `app.chats`
- `app.chat_messages`

Required invariants:

- unique share per `(note_id, shared_with_user_id)`
- unique tag assignment per `(note_id, tag_id)`
- checked message role values
- chat messages cascade on chat delete

### Batch 6: People

Create:

- `app.people`
- `app.person_relationships`

Do not create a separate `contacts` table.

### Batch 7: Tasks And Goals

Create:

- `app.task_lists`
- `app.task_list_members`
- `app.task_list_invites`
- `app.tasks`
- `app.goals`
- `app.key_results`

Required invariants:

- unique member per `(list_id, user_id)`
- unique invite token
- checked task status and priority

### Batch 8: Places, Calendar, Travel

Create:

- `app.places`
- `app.calendar_events`
- `app.calendar_attendees`
- `app.travel_trips`
- `app.travel_flights`
- `app.travel_hotels`

If `postgis` is included:

- add generated or synced geography support to `app.places`

### Batch 9: Finance

Create:

- `app.finance_institutions`
- `app.finance_categories`
- `app.finance_accounts`
- `app.finance_transactions`
- `app.plaid_items`

Required invariants:

- unique provider item id per user
- category foreign key must resolve to a real category table
- no partitioning in V1

### Batch 10: Media

Create:

- `app.music_artists`
- `app.music_albums`
- `app.music_tracks`
- `app.music_playlists`
- `app.music_playlist_tracks`
- `app.music_listens`
- `app.music_likes`
- `app.video_channels`
- `app.video_subscriptions`
- `app.video_views`

Required invariants:

- unique playlist membership per `(playlist_id, track_id)`
- unique like per `(user_id, track_id)`
- no partitioning in V1

### Batch 11: Inventory

Create:

- `app.possession_containers`
- `app.possessions`
- `app.possession_events`

Rename `usage` semantics to `events`.

### Batch 12: Ops

Create:

- `ops.audit_logs`
- `ops.search_logs`
- `ops.schema_jobs`

Do not partition these initially.

### Batch 13: RLS

Apply RLS after tables exist.

Rules:

- `auth` schema is service-owned first
- `app` schema uses explicit tenant and share/member policies
- `ops` schema is service-only

### Batch 14: Search And Secondary Indexes

Add:

- `tsvector` indexes where text search is a real product requirement
- trigram indexes for name/query lookup
- selective compound indexes from known query patterns

Do not copy every index from the dump baseline automatically.

## Old-To-New Table Mapping

### Auth

- `users` -> `auth.users`
- `auth_subjects` + `user_account` + `user_accounts` -> `auth.identities`
- `auth_sessions` + `user_session` + `user_sessions` -> `auth.sessions`
- `auth_refresh_tokens` -> `auth.refresh_tokens`
- `user_passkey` -> `auth.passkeys`
- `user_verification` -> `auth.verification_tokens`
- `user_device_code` -> `auth.device_codes`
- `user_api_keys` -> `auth.api_keys`
- `user_jwks` -> cut from V1 unless there is a concrete runtime need

### Knowledge And Collaboration

- `notes` -> `app.notes` + `app.note_versions`
- `note_shares` -> `app.note_shares`
- `tags` -> `app.tags`
- `note_tags` -> `app.note_tags`
- `tag_shares` -> defer until tag sharing is explicitly needed
- `tagged_items` -> cut from V1
- `chat` -> `app.chats`
- `chat_message` -> `app.chat_messages`

### People

- `contacts` + `persons` -> `app.people`
- `user_person_relations` -> `app.person_relationships`

### Tasks And Goals

- `task_lists` -> `app.task_lists`
- `task_list_collaborators` -> `app.task_list_members`
- `task_list_invites` -> `app.task_list_invites`
- `tasks` -> `app.tasks`
- `goals` -> `app.goals`
- `key_results` -> `app.key_results`

### Places, Calendar, Travel

- `places` -> `app.places`
- `calendar_events` -> `app.calendar_events`
- `calendar_attendees` -> `app.calendar_attendees`
- `travel_trips` -> `app.travel_trips`
- `travel_flights` -> `app.travel_flights`
- `travel_hotels` -> `app.travel_hotels`

### Finance

- `financial_institutions` -> `app.finance_institutions`
- `finance_accounts` -> `app.finance_accounts`
- `finance_transactions` -> `app.finance_transactions`
- `plaid_items` -> `app.plaid_items`
- `budget_goals` -> defer from V1 until category and budgeting model is finalized

### Media

- `music_artists` -> `app.music_artists`
- `music_albums` -> `app.music_albums`
- `music_tracks` -> `app.music_tracks`
- `music_playlists` -> `app.music_playlists`
- `music_playlist_tracks` -> `app.music_playlist_tracks`
- `music_listening` -> `app.music_listens`
- `music_liked` -> `app.music_likes`
- `video_channels` -> `app.video_channels`
- `video_subscriptions` -> `app.video_subscriptions`
- `video_viewings` -> `app.video_views`

### Inventory

- `possession_containers` -> `app.possession_containers`
- `possessions` -> `app.possessions`
- `possessions_usage` -> `app.possession_events`

### Ops

- `logs` -> `ops.audit_logs`
- `searches` -> `ops.search_logs`

## Explicit Cuts From V1

Cut from the first clean baseline unless the product requirement is immediate and specific:

- partition child tables
- partition-maintenance functions
- `partition_audit` view
- `health_records`
- `schools`
- `career_companies`
- `career_jobs`
- `career_applications`
- `career_interviews`
- generic polymorphic tagging
- tag sharing
- JWK storage
- provider payload sprawl that has no read path

These can come back later as isolated migrations.

## Acceptance Criteria For The Clean Baseline

The new baseline is ready when:

1. a fresh Postgres database bootstraps from zero using Goose only
2. all baseline tables live in `auth`, `app`, or `ops`, not `public`
3. there is exactly one canonical auth/session model
4. there is no partitioning in the baseline
5. extension usage is minimal and justified
6. every mutable table has consistent timestamps
7. RLS is present only where the access model is clear
8. generated Kysely types come from the clean baseline, not the dump baseline

## First Build Recommendation

The first actual implementation slice should be:

1. `create_core_schemas`
2. `install_required_extensions`
3. `create_shared_functions`
4. `create_auth_tables`
5. `create_auth_indexes_and_constraints`

That gives us the cleanest foundation for every app and service path that depends on users, sessions, passkeys, API keys, and verification.
