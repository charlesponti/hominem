## 1. Audit & Discovery

- [x] 1.1 Map all tables in tables.ts to service code usage (grep for table references)
- [x] 1.2 Identify which tables are actively used vs legacy imports
- [x] 1.3 Identify which import tables (google_*, apple_*, spotify_*, sqlite_*) are used
- [x] 1.4 Document which domains/tables to merge vs keep standalone

## 2. Remove Duplicate Definitions

- [x] 2.1 Audit all schema files for duplicate table definitions
- [x] 2.2 Consolidate: keep definition in individual schema file, not tables.ts
- [x] 2.3 Update tables.ts to re-export ONLY from individual files
- [x] 2.4 Ensure no table defined in two places

## 3. Remove Legacy Auth Tables

- [x] 3.1 Delete auth.schema.ts entirely (authSubjects, authSessions, authRefreshTokens, authPasskeys, authDeviceCodes)
- [x] 3.2 Remove account table from users.schema.ts (keep user_account only)
- [x] 3.3 Update db index exports
- [x] 3.4 Verify better-auth tables (user_session, user_account, etc.) are correct

## 4. Convert tables.ts to snake_case

- [x] 4.1 Iterate through tables.ts and convert all camelCase columns to snake_case
- [x] 4.2 Convert createdAt → created_at, updatedAt → updated_at, userId → user_id
- [x] 4.3 Convert any TEXT timestamps to proper timestamp() type
- [x] 4.4 Update all column references in tables.ts

## 5. Create Unified Health Records Schema

- [x] 5.1 Create health-records.schema.ts with unified table structure
- [x] 5.2 Define record_type enum (activity, metric_steps, metric_heart_rate, metric_weight, metric_bp_systolic, metric_bp_diastolic, metric_sleep)
- [x] 5.3 Add user_id FK to users table
- [x] 5.4 Add indices: (user_id, recorded_at DESC), (user_id, record_type)
- [x] 5.5 Export types: HealthRecord, HealthRecordInsert
- [x] 5.6 Add Zod schemas for validation
- [x] 5.7 Remove old health tables from tables.ts (health, healthMetrics, etc.)

## 6. Create Unified Persons Schema

- [x] 6.1 Create persons.schema.ts merging people, contacts, person, relationships
- [x] 6.2 Define person_type enum (self, contact, relationship, family, colleague)
- [x] 6.3 Include all fields from source tables as nullable columns
- [x] 6.4 Add user_id FK to users table
- [x] 6.5 Add indices: (user_id, person_type), (user_id, email)
- [x] 6.6 Export types: Person, PersonInsert
- [x] 6.7 Add Zod schemas for validation
- [x] 6.8 Remove old tables from tables.ts (people, contacts, person, relationships)

## 7. Create Generic Platform Tables

- [x] 7.1 Rename google_playlists → music_playlists (add source column)
- [x] 7.2 Create music_tracks table (from spotify_yourlibrary tracks + google_music_library_songs)
- [x] 7.3 Create music_albums table (from spotify_yourlibrary albums)
- [x] 7.4 Create music_artists table (from spotify_yourlibrary artists)
- [x] 7.5 Create music_shows table (from spotify_yourlibrary shows)
- [x] 7.6 Create music_episodes table (from spotify_yourlibrary episodes)
- [x] 7.7 Rename google_your_liked_content → music_liked (add source)
- [x] 7.8 Rename google_videos_log → video_watch_history (add source)
- [x] 7.9 Rename google_subscriptions → subscriptions (add source)
- [x] 7.10 Rename google_channel → video_channels (add source)
- [x] 7.11 Rename google_comments → video_comments (add source)
- [x] 7.12 Rename google_your_follows → video_follows (add source)
- [x] 7.13 Rename google_live_chats → social_chat_messages (add source)
- [x] 7.14 Create social_follows table (merge spotify_follow, add source)
- [x] 7.15 Rename google_mobile_devices → devices (add source)
- [x] 7.16 Rename google_notification_tokens → notification_tokens (add provider)
- [x] 7.17 Rename google_money_sends_and_requests → payment_transactions (add provider)
- [x] 7.18 Rename google_cashback_rewards → payment_rewards (add source)
- [x] 7.19 Rename spotify_payments → payment_methods (add provider)
- [x] 7.20 Rename google_account → provider_accounts (add provider)
- [x] 7.21 Rename google_reading_list → reading_lists (add source)
- [x] 7.22 Rename google_my_shopping_list → shopping_lists (add source)
- [x] 7.23 Rename google_my_cookbook → saved_recipes (add source)
- [x] 7.24 Rename google_favorite_jobs → saved_jobs (add source)
- [x] 7.25 Rename google_favorite_images → saved_images (add source)
- [x] 7.26 Rename google_saves_data → saved_content (add source)
- [x] 7.27 Merge apple_notes_* tables into unified notes table
- [x] 7.28 Add source/platform/provider columns to all renamed tables
- [x] 7.29 Add indices on (user_id, source/platform/provider)
- [x] 7.30 Remove old google_*, apple_*, spotify_* tables from tables.ts

## 8. Merge Other Legacy Domains

- [x] 8.1 Create unified media_entries table (games, entertainmentBacklog, mediaLog, readingLog, podcastPlays, musicListeningLog)
- [x] 8.2 Define media_type enum for different content types
- [x] 8.3 Add user_id FK and indices
- [x] 8.4 Merge amazonPurchases, incomeLog into finance_transactions
- [x] 8.5 Merge tarotReadings into logs or notes
- [x] 8.6 Evaluate searches table - merge or remove
- [x] 8.7 Rename transactions → finance_transactions
- [x] 8.8 Rename accounts → finance_accounts
- [x] 8.9 Rename budget_categories → finance_categories
- [x] 8.10 Rename budget_goals → finance_goals
- [x] 8.11 Rename financial_institutions → finance_institutions
- [x] 8.12 Rename plaid_items → finance_plaid_items
- [x] 8.13 Remove old tables from tables.ts

## 9. Remove Migration Artifacts

- [x] 9.1 Remove sqlite_id column from any surviving tables
- [x] 9.2 Remove source_file, source_db columns from any tables
- [x] 9.3 Verify no migration-specific columns remain

## 10. Standardize PK/FK/Index/Naming

- [x] 10.1 Audit all tables for UUID PKs (convert serial/integer PKs)
- [x] 10.2 Standardize FK naming: {table}_{column}_fk
- [x] 10.3 Standardize index naming: {table}_{column}_idx
- [x] 10.4 Ensure all timestamps use timestamp() with mode: 'string'
- [x] 10.5 Add CHECK constraints for timestamps where appropriate

## 11. Add RLS Policies

- [x] 11.1 Audit all tables for missing RLS policies
- [x] 11.2 Add user isolation policies to all user-data tables
- [x] 11.3 Use auth.uid() pattern consistently
- [x] 11.4 Handle cross-user sharing tables appropriately

## 12. Update Code Imports

- [x] 12.1 Find all imports referencing tables.ts directly
- [x] 12.2 Update imports to use individual schema files
- [x] 12.3 Find all queries using camelCase column names
- [x] 12.4 Update queries to use snake_case column names
- [x] 12.5 Find all references to deprecated tables (auth_*, legacy account)
- [x] 12.6 Update imports for renamed/deprecated tables

## 13. Generate & Apply Migration

- [x] 13.1 Run drizzle-kit generate for new schema
- [x] 13.2 Review migration SQL for correctness
- [x] 13.3 Apply migration to local database
- [x] 13.4 Verify all tables created correctly
- [x] 13.5 Run typecheck to ensure no breaking changes

## 14. Verify Implementation Against Specs

- [x] 14.1 Verify schema-consolidation spec requirements
- [x] 14.2 Verify auth-system-cleanup spec requirements
- [x] 14.3 Verify person-consolidation spec requirements
- [x] 14.4 Verify health-records-unified spec requirements
- [x] 14.5 Verify external-data-consolidation spec requirements
- [x] 14.6 Verify schema-standards spec requirements
- [x] 14.7 Verify logging-consolidated spec requirements

## 15. Run Tests and Validation

- [x] 15.1 Run full test suite
- [x] 15.2 Run typecheck
- [x] 15.3 Run lint
- [x] 15.4 Manually verify key queries work
- [x] 15.5 Verify RLS policies work correctly
