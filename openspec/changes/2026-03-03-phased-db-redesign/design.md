## Context

The database was dropped and migrations deleted, giving us a clean slate. However, the existing schema files have systemic issues:

**Critical Problems Found:**
1. **Duplicate definitions**: `tables.ts` (~100+ tables, camelCase) vs individual schema files (snake_case) - same tables defined MULTIPLE times
2. **Naming chaos**: camelCase in `tables.ts`, snake_case in newer schemas
3. **Auth fragmentation**: Legacy `auth.schema.ts` (authSubjects, authSessions, etc.) duplicates better-auth tables
4. **Health mess**: 7+ tables (health, healthMetrics, healthLog, healthWeight, healthSleep, healthBloodPressure, healthHeartRate)
5. **Person overlap**: 4 tables (people, contacts, person, relationships) with unclear boundaries
6. **Legacy clutter**: 30+ Google/Apple/Spotify import tables, SQLite migration artifacts

We need to fix these systemic issues by merging/consolidating into a thinner, more robust schema.

## Goals / Non-Goals

**Goals:**
- Single source of truth for ALL table definitions (no duplicates)
- Consistent snake_case naming throughout ALL tables
- Unified health, person, auth schemas through consolidation
- All timestamps as TIMESTAMP WITH TIME ZONE
- All PKs as UUID
- Proper FKs, indices, RLS policies
- Merge legacy import tables into unified external_data table
- Thinner, more robust schema with fewer tables

**Non-Goals:**
- Keep backward compatibility with old table names
- Migrate any existing data (database was dropped)
- Delete any tables - merge instead
- Maintain `tables.ts` as the primary definition location

## Decisions

### 1. Consolidate Table Definitions

**Decision: Individual schema files are the source of truth. `tables.ts` becomes minimal re-exports ONLY.**

- Each domain gets its own file: `auth/`, `health/`, `person/`, `finance/`, etc.
- No table defined in two places
- `tables.ts` imports from individual files and re-exports for backward compat

**Rationale**: Eliminates the duplicate definition problem. Clear ownership.

---

### 2. Schema Naming Convention

**Decision: Enforce snake_case for ALL column names, ALL tables.**

- Use `created_at`, `updated_at`, `user_id`, not `createdAt`, `updatedAt`, `userId`
- This applies to `tables.ts` tables too - convert them

**Rationale**: PostgreSQL best practice, consistency, easier queries.

---

### 3. Remove Legacy Auth Tables

**Decision: Delete `auth.schema.ts` entirely. Keep only better-auth based tables.**

- Remove: `authSubjects`, `authSessions`, `authRefreshTokens`, `authPasskeys`, `authDeviceCodes`
- Keep: `user_session`, `user_account`, `user_passkey`, `user_api_key`, `user_verification`, `user_device_code`
- Remove: legacy `account` table (NextAuth), keep `user_account`

**Rationale**: Legacy auth system was never used. Better-auth is the active system.

---

### 4. Health Consolidation

**Decision: Merge 7+ health tables into unified `health_records` table.**

```
health_records (
  id UUID PK,
  user_id UUID FK→users,
  record_type ENUM ('activity', 'metric_steps', 'metric_heart_rate', 
                   'metric_weight', 'metric_bp_systolic', 'metric_bp_diastolic', 
                   'metric_sleep'),
  value DECIMAL,
  unit TEXT,
  activity_type TEXT,
  duration_minutes INT,
  platform TEXT (apple_health, google_fit, garmin, manual),
  recorded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
```

- Index on (user_id, recorded_at DESC)
- Index on (user_id, record_type)

**Rationale**: Single table for all health data is more robust than scattered tables.

---

### 5. Person/Contact Consolidation

**Decision: Merge `people`, `contacts`, `person` into unified `persons` table with type discriminator.**

```
persons (
  id UUID PK,
  user_id UUID FK→users,
  person_type ENUM ('self', 'contact', 'relationship', 'family', 'colleague'),
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  notes TEXT,
  -- relationship-specific fields (nullable)
  date_started TIMESTAMP,
  date_ended TIMESTAMP,
  -- timestamps
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

- Index on (user_id, person_type)
- Index on (user_id, email)

**Rationale**: One table for all person types is thinner and more maintainable than 3-4 separate tables.

---

### 6. Generic Platform-Agnostic Tables (Google/Apple/Spotify)

**Decision: Replace provider-specific prefixes with generic table names using separate prefixes for music/video, add `source` column for discrimination.**

Rename tables using separate prefixes:

| Category | Current | Proposed | Adds |
|----------|---------|----------|------|
| **Music** | `spotify_yourlibrary` (tracks) | `music_tracks` | `source: 'spotify'/'google_play_music'` |
| | `spotify_yourlibrary` (albums) | `music_albums` | `source: 'spotify'` |
| | `spotify_yourlibrary` (artists) | `music_artists` | `source: 'spotify'` |
| | `spotify_yourlibrary` (shows) | `music_shows` | `source: 'spotify'` |
| | `spotify_yourlibrary` (episodes) | `music_episodes` | `source: 'spotify'` |
| | `google_playlists` | `music_playlists` | `source: 'youtube'/'spotify'` |
| | `google_your_liked_content` | `music_liked` | `source: 'youtube'/'spotify'` |
| **Video** | `google_videos_log` | `video_watch_history` | `source: 'youtube'` |
| | `google_subscriptions` | `subscriptions` | `source: 'youtube'` |
| | `google_channel` | `video_channels` | `source: 'youtube'` |
| | `google_comments` | `video_comments` | `source: 'youtube'` |
| | `google_your_follows` | `video_follows` | `source: 'youtube'` |
| **Social** | `spotify_follow` | `social_follows` | `source: 'spotify'` |
| | `google_live_chats` | `social_chat_messages` | `source: 'youtube'` |
| **Devices** | `google_mobile_devices` | `devices` | `source: 'google'/'apple'` |
| | `google_notification_tokens` | `notification_tokens` | `provider: 'google'/'apple'` |
| **Payments** | `google_money_sends_and_requests` | `payment_transactions` | `provider: 'google_pay'` |
| | `google_cashback_rewards` | `payment_rewards` | `source: 'google'` |
| | `spotify_payments` | `payment_methods` | `provider: 'spotify'` |
| **Accounts** | `google_account` | `provider_accounts` | `provider: 'google'/'apple'/'spotify'` |
| **Saved** | `google_reading_list` | `reading_lists` | `source: 'chrome'` |
| | `google_my_shopping_list` | `shopping_lists` | `source: 'google'` |
| | `google_my_cookbook` | `saved_recipes` | `source: 'google'` |
| | `google_favorite_jobs` | `saved_jobs` | `source: 'google'` |
| | `google_favorite_images` | `saved_images` | `source: 'google'` |
| | `google_saves_data` | `saved_content` | `source: 'google'` |

**Apple Notes - Keep Separate:**
| Current | Proposed |
|---------|----------|
| `apple_notes_details` | `notes` (add `source: 'apple'`, `is_locked: boolean`, `shared_with: jsonb`) |
| `apple_notes_locked` | Merge into `notes` |
| `apple_notes_shared` | Merge into `notes` |

**Archive Low-Value Tables:**
- `google_australia` - unclear purpose
- `google_default_list` - generic catch-all
- `google_tombstones` - deletion metadata
- `google_not_interested_setting` - YouTube preference
- `google_channel_images` - rarely used
- `google_channel_feature_data` - rarely used
- `google_channel_page_settings` - rarely used
- `google_channel_url_configs` - rarely used
- `google_channel_community_moderation_settings` - rarely used
- `google_info` / `google_members` / `google_recently_viewed_groups` - Google Groups, rarely used
- `google_activities_a_list_of_google_services_accessed_by` - activity log, rarely used
- `google_your_personalization_feedback` - preference data, rarely used
- `google_my_cookbook` - saved to `saved_recipes`
- `spotifyYourlibrary` - duplicate of `spotify_yourlibrary`

**Rationale**: Separate prefixes (`music_`, `video_`) prevent confusion between music and video content. Adding a `source` column enables filtering while preserving provider-specific fields. Scales for future providers (Apple Music, Netflix, TikTok, etc.).

---

### 7. Merge Other Legacy Domains

**Decision: Consolidate other scattered tables into unified tables where possible:**

- `games`, `entertainmentBacklog`, `mediaLog`, `readingLog` → `media_entries` with type discriminator
- `tarotReadings` → merge into `logs` or `notes`
- `amazonPurchases`, `incomeLog` → merge into `finance_transactions`
- `searches` → merge into `logs` or delete if unused
- `podcastPlays`, `musicListeningLog` → merge into `music_listening` table
- **Finance tables**: Rename all with `finance_` prefix:
  - `transactions` → `finance_transactions`
  - `accounts` → `finance_accounts`
  - `budget_categories` → `finance_categories`
  - `budget_goals` → `finance_goals`
  - `financial_institutions` → `finance_institutions`
  - `plaid_items` → `finance_plaid_items`

**Rationale**: Fewer, more general tables are easier to maintain than many specialized tables. The `finance_` prefix clarifies domain ownership.

---

### 8. PK/FK/Index Standards

**Decision: Standardize across all tables.**

| Standard | Pattern |
|----------|---------|
| Primary Key | `id: uuid('id').primaryKey().defaultRandom().notNull()` |
| Foreign Key | `user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' })` |
| Timestamps | `created_at: timestamp('created_at', { precision: 3, mode: 'string' }).defaultNow().notNull()` |
| Index naming | `{table}_{column}_idx` (e.g., `user_id_idx`) |
| FK naming | `{table}_{column}_fk` (e.g., `user_id_fk`) |

---

### 9. RLS Policy Standardization

**Decision: Add RLS to ALL user-data tables.**

- Every table with user_id must have RLS policy
- Use `auth.uid()` for current user
- Policies: user can CRUD their own rows

---

### 10. Remove Migration Artifacts

**Decision: Remove all migration-specific columns.**

- Remove `sqlite_id`, `source_file`, `source_db` columns from any surviving tables
- No columns that only made sense during migration

---

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Code imports from tables.ts directly | Breakage | Grep for imports, update before deploy |
| camelCase → snake_case in queries | Runtime errors | Full codebase grep for old column names |
| Consolidation loses domain-specific fields | Data model mismatch | Add nullable fields to unified table for flexibility |
| tables.ts removal breaks external consumers | API breaks | Keep re-exports, just remove dup definitions |

## Migration Plan

Since database was dropped, this is fresh schema creation:

1. **Audit phase**: Map which tables are actually used by services
2. **Design unified tables**: Create schema for persons, external_data, media_entries
3. **Create individual schema files**: Each domain in its own file
4. **Convert**: Update tables.ts columns to snake_case, update table names
5. **Generate**: Run drizzle-kit generate
6. **Deploy**: Apply migration
7. **Verify**: Run tests, typecheck, manual verification

## Open Questions

1. **What fields are essential for each unified table?** Need to preserve all domain-specific fields as nullable columns.
2. **What's the minimum viable set of tables for v1?** Need to prioritize.
3. **RLS complexity**: Some tables need cross-user sharing. How handle?
4. **data_type values for external_data**: Which types to support initially?
