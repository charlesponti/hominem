# Database V1 Blueprint

## Goal

Define the greenfield database we would intentionally ship today, without inheriting accidental complexity from [20260309120000_schema_baseline.sql](/Users/charlesponti/Developer/hominem/packages/db/migrations/20260309120000_schema_baseline.sql).

This document is the target design for the first clean Goose baseline.

## Principles

1. Model the product we know, not every future possibility.
2. Keep auth, app data, and operational data in separate schemas.
3. Prefer strong constraints over convention.
4. Start unpartitioned unless a table is clearly high-volume and append-only.
5. Use `jsonb` only for bounded provider payloads or intentionally schemaless metadata.
6. Keep the first version small enough to understand.

## Schemas

### `auth`

Owns identity, login state, credentials, verification, and API access.

Tables:

- `auth.users`
- `auth.identities`
- `auth.sessions`
- `auth.refresh_tokens`
- `auth.passkeys`
- `auth.verification_tokens`
- `auth.device_codes`
- `auth.api_keys`

### `app`

Owns all tenant-facing product data.

Tables:

- `app.notes`
- `app.note_versions`
- `app.note_shares`
- `app.tags`
- `app.note_tags`
- `app.chats`
- `app.chat_messages`
- `app.people`
- `app.person_relationships`
- `app.places`
- `app.bookmarks`
- `app.task_lists`
- `app.task_list_members`
- `app.task_list_invites`
- `app.tasks`
- `app.goals`
- `app.key_results`
- `app.calendar_events`
- `app.calendar_attendees`
- `app.finance_institutions`
- `app.finance_accounts`
- `app.finance_categories`
- `app.finance_transactions`
- `app.plaid_items`
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
- `app.travel_trips`
- `app.travel_flights`
- `app.travel_hotels`
- `app.possession_containers`
- `app.possessions`
- `app.possession_events`

### `ops`

Owns internal telemetry and background-maintenance data.

Tables:

- `ops.audit_logs`
- `ops.search_logs`
- `ops.schema_jobs`

## Extensions

Start with the minimum set:

- `pgcrypto`
- `pg_trgm`
- `unaccent`
- `postgis` only if places launches in V1
- `vector` only if embeddings launch in V1

Do not include `pgrouting`, `hstore`, `intarray`, `cube`, `earthdistance`, `btree_gin`, `btree_gist`, or `"uuid-ossp"` in the first clean baseline unless a concrete schema object requires them.

## Canonical Foundation Tables

### `auth.users`

Columns:

- `id uuid primary key default gen_random_uuid()`
- `email citext not null unique`
- `display_name text`
- `avatar_url text`
- `email_verified_at timestamptz`
- `is_admin boolean not null default false`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Rules:

- no duplicate `image` and `avatar_url`
- do not keep both `email_verified boolean` and `email_verified_at`

### `auth.identities`

Replaces `auth_subjects`, `user_account`, and `user_accounts`.

Columns:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `provider text not null`
- `provider_subject text not null`
- `provider_account_id text`
- `access_token_encrypted text`
- `refresh_token_encrypted text`
- `id_token_encrypted text`
- `scope text`
- `linked_at timestamptz not null default now()`
- `last_used_at timestamptz`
- `revoked_at timestamptz`

Constraints:

- unique `(provider, provider_subject)`
- unique `(user_id, provider, provider_account_id)` when `provider_account_id` is not null

### `auth.sessions`

One canonical session table. Replaces `auth_sessions`, `user_session`, and `user_sessions`.

Columns:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `token_hash text not null unique`
- `state text not null`
- `auth_level text not null`
- `amr jsonb not null default '[]'::jsonb`
- `ip_hash text`
- `user_agent_hash text`
- `expires_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `last_seen_at timestamptz not null default now()`
- `revoked_at timestamptz`

Rules:

- store token hashes, not raw tokens
- `user_id` must not be nullable

### `auth.refresh_tokens`

Keep token family rotation, but hang it off the one canonical session model.

Columns:

- `id uuid primary key`
- `session_id uuid not null references auth.sessions(id) on delete cascade`
- `family_id uuid not null`
- `parent_id uuid references auth.refresh_tokens(id) on delete set null`
- `token_hash text not null unique`
- `expires_at timestamptz not null`
- `used_at timestamptz`
- `revoked_at timestamptz`
- `created_at timestamptz not null default now()`

### `auth.passkeys`

Replaces `user_passkey`.

Columns:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `credential_id text not null unique`
- `public_key bytea not null`
- `sign_count bigint not null default 0`
- `device_type text`
- `backed_up boolean not null default false`
- `transports text[]`
- `aaguid uuid`
- `friendly_name text`
- `created_at timestamptz not null default now()`
- `last_used_at timestamptz`

### `auth.verification_tokens`

Replaces `user_verification`.

Columns:

- `id uuid primary key`
- `user_id uuid references auth.users(id) on delete cascade`
- `channel text not null`
- `identifier text not null`
- `token_hash text not null`
- `purpose text not null`
- `expires_at timestamptz not null`
- `consumed_at timestamptz`
- `created_at timestamptz not null default now()`

Constraints:

- unique `(purpose, identifier, token_hash)`

### `auth.device_codes`

Replaces `user_device_code`.

Columns:

- `id uuid primary key`
- `user_id uuid references auth.users(id) on delete set null`
- `device_code text not null unique`
- `user_code text not null unique`
- `client_id text`
- `scope text`
- `status text not null`
- `expires_at timestamptz not null`
- `polling_interval_seconds integer not null`
- `last_polled_at timestamptz`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

### `auth.api_keys`

Replaces `user_api_keys`.

Columns:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `name text not null`
- `key_hash text not null unique`
- `prefix text not null`
- `last_used_at timestamptz`
- `expires_at timestamptz`
- `revoked_at timestamptz`
- `created_at timestamptz not null default now()`

## Canonical App Models

### Notes

Use:

- `app.notes`
- `app.note_versions`
- `app.note_shares`
- `app.tags`
- `app.note_tags`

Rules:

- `app.notes` is the stable logical note
- `app.note_versions` stores title/content/excerpt/version metadata
- `parent_note_id` supports hierarchy only on `app.notes`
- remove `is_latest_version` from the row shape and derive latest by unique `(note_id, version_number desc)` or a `current_version_id`

### Chats

Use:

- `app.chats`
- `app.chat_messages`

Rules:

- chats belong to a user and optionally reference a note
- messages belong to a chat
- assistant messages do not need `user_id`
- `role` should be constrained to the supported set
- `files`, `tool_calls`, and `reasoning` can stay as bounded `jsonb`/`text`

### People

Merge `contacts` and `persons` into one `app.people` table.

Keep:

- personal identity fields
- contact fields
- lightweight relationship metadata

Drop:

- the separate `contacts` table

Use `app.person_relationships` only if many-to-many relationship tracking is truly needed.

### Tasks And Goals

Keep:

- `app.task_lists`
- `app.task_list_members`
- `app.task_list_invites`
- `app.tasks`
- `app.goals`
- `app.key_results`

Changes:

- rename `task_list_collaborators` to `task_list_members`
- constrain `status`, `priority`, and invite state with checks
- keep `tasks.parent_task_id` as nullable self-reference

### Calendar

Keep:

- `app.calendar_events`
- `app.calendar_attendees`

Changes:

- replace `location_coords jsonb` with typed location fields or a link to `app.places`
- constrain attendee `status` and `role`
- keep recurrence in `jsonb` only if using RFC-style recurrence payloads directly

### Finance

Keep:

- `app.finance_institutions`
- `app.finance_accounts`
- `app.finance_transactions`
- `app.plaid_items`

Add:

- `app.finance_categories`

Changes:

- do not partition `finance_transactions` in V1
- use one `provider_item_id` uniqueness rule on Plaid items
- encrypt or externalize provider access tokens; do not keep them as plain text in `public`
- replace free-text transaction/category state with checked values where possible

### Media

Keep music and video concepts, but simplify:

- `app.music_listening` becomes `app.music_listens`
- `app.video_viewings` becomes `app.video_views`
- no partitioning in V1
- no future partition-maintenance functions in baseline

### Places

Keep `app.places`, but store either:

- `latitude`, `longitude`, and generated `geography`

or

- only `geography`

Do not keep both `location_coords jsonb` and PostGIS geography for the same concept.

### Possessions

Keep:

- `app.possession_containers`
- `app.possessions`

Rename:

- `app.possessions_usage` to `app.possession_events`

This better reflects that the table stores generic possession lifecycle events, not only “usage.”

## Delete Or Replace From Current Baseline

Delete outright from the clean V1 baseline:

- `user_account`
- `user_accounts`
- `user_session`
- `user_sessions`
- `auth_subjects`
- partition child tables for finance, health, logs, music, searches, and video
- partition maintenance functions and `partition_audit` view

Replace:

- `contacts` + `persons` -> `app.people`
- `user_passkey` -> `auth.passkeys`
- `user_verification` -> `auth.verification_tokens`
- `user_device_code` -> `auth.device_codes`
- `user_api_keys` -> `auth.api_keys`
- `notes` -> `app.notes` + `app.note_versions`

## Constraint And Type Policy

Use these defaults everywhere:

- every mutable table gets `created_at not null default now()` and `updated_at not null default now()`
- every `updated_at` table gets the shared trigger
- enum-like fields use `check` constraints unless a real PostgreSQL enum has strong value
- user-owned tables keep `owner_user_id` or `user_id` not null unless anonymous records are a real requirement
- case-insensitive email uses `citext` or unique index on normalized value

## RLS Policy Shape

Apply RLS only to tenant-owned app tables in `app`.

Do not use the same tenant policy pattern for auth-internal tables blindly.

Recommended split:

- `auth` tables: service-role access only, plus narrow self-access where required
- `app` tables: owner/member/share-based policies
- `ops` tables: service-role only

## V1 Migration Sequence

### Batch 1: Foundation

- create schemas
- install minimal extensions
- create shared trigger function
- create helper auth-context functions

### Batch 2: Auth

- create `auth.users`
- create `auth.identities`
- create `auth.sessions`
- create `auth.refresh_tokens`
- create `auth.passkeys`
- create `auth.verification_tokens`
- create `auth.device_codes`
- create `auth.api_keys`

### Batch 3: Core Knowledge

- create `app.notes`
- create `app.note_versions`
- create `app.note_shares`
- create `app.tags`
- create `app.note_tags`
- create `app.chats`
- create `app.chat_messages`

### Batch 4: People And Tasks

- create `app.people`
- create `app.person_relationships`
- create `app.task_lists`
- create `app.task_list_members`
- create `app.task_list_invites`
- create `app.tasks`
- create `app.goals`
- create `app.key_results`

### Batch 5: Places, Calendar, And Travel

- create `app.places`
- create `app.calendar_events`
- create `app.calendar_attendees`
- create `app.travel_trips`
- create `app.travel_flights`
- create `app.travel_hotels`

### Batch 6: Finance

- create `app.finance_institutions`
- create `app.finance_categories`
- create `app.finance_accounts`
- create `app.finance_transactions`
- create `app.plaid_items`

### Batch 7: Media And Inventory

- create music tables
- create video tables
- create possession tables

### Batch 8: Ops

- create `ops.audit_logs`
- create `ops.search_logs`
- add retention policies later, not partitioning on day one

## Recommendation

Do not freeze the current dump baseline as the schema we build from.

Freeze it only as a source document for product concepts and edge cases. Then build a new clean Goose baseline from this blueprint, one migration batch at a time.
