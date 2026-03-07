## Why

The database was dropped and all migration files were deleted, giving us a greenfield opportunity to design a clean, well-structured schema from scratch. 

**Strategic analysis reveals critical issues:**
- `tables.ts` defines ~100+ tables with camelCase columns, while newer schema files use snake_case - massive inconsistency
- Same tables defined MULTIPLE times across files (users, account, auth tables, contacts, tasks, finance tables)
- 7+ fragmented health tables that should be unified
- 4 overlapping person/contact tables (people, contacts, person, relationships)
- Legacy import tables from Google/Apple/Spotify/SQLite migrations that clutter the schema
- Inconsistent PK types (uuid, serial, integer, text), FK naming, index naming, RLS policies

This is NOT just a migration - it's a chance to fix systemic architecture problems by merging and consolidating into a thinner, more robust schema.

## What Changes

### Phase 1: Foundation & Cleanup

- **Single source of truth**: Consolidate ALL table definitions to individual schema files only. Delete or dramatically simplify `tables.ts`.
- **Naming convention**: Enforce snake_case for ALL column names across ALL tables.
- **Timestamp standardization**: All as `TIMESTAMP WITH TIME ZONE`, no TEXT timestamps.
- **PK standardization**: All UUID with `defaultRandom()`.

### Phase 2: Auth Schema

- **Clean auth schema**: Use `users` as canonical identity with `user_*` tables for sessions, accounts, passkeys, API keys.
- **Remove duplicate auth tables**: Delete legacy `auth.schema.ts` definitions (authSubjects, authSessions, etc.) - already have better-auth equivalents.
- **Remove NextAuth remnant**: Delete `account` table, keep `user_account`.

### Phase 3: Domain Consolidation (Merge/Refactor)

- **Unified health schema**: Merge 7+ health tables into single `health_records` time-series table.
- **Unified person/contact schema**: Merge `people`, `contacts`, `person` into unified `persons` table with type discriminator.
- **Generic platform tables**: Rename Google/Apple/Spotify tables to generic names with `music_`/`video_` prefixes, add `source` column for provider discrimination.
- **Unified logging**: Keep existing `logs` table design.
- **Prefix all domain tables**: Use clear prefixes (`music_`, `video_`, `social_`, `finance_`, `travel_`, `career_`, etc.)

### Phase 4: Remove Migration Artifacts

- **Remove sqlite_id, source_file, source_db columns** from any surviving tables.

### Phase 5: Standards Enforcement

- **Consistent FK naming**: Create naming convention and apply uniformly.
- **Consistent index naming**: Create naming convention and apply uniformly.
- **RLS policies**: Audit and add to all user-data tables.
- **JSON handling**: Standardize on JSONB, not text/string.

## Capabilities

### New Capabilities
- `schema-consolidation`: Fix duplicate/messy table definitions - single source of truth, snake_case, UUID PKs
- `auth-system-cleanup`: Fresh auth schema with users as canonical identity
- `person-consolidation`: Unified persons table with type discriminator (self, contact, etc.)
- `health-records-unified`: Time-series health records table design
- `external-data-consolidation`: Rename provider-specific tables to generic names, add source column
- `schema-standards`: Consistent snake_case, proper timestamps, FK constraints, UUID PKs
- `logging-consolidated`: Unified logs table

### Modified Capabilities
- (none - fresh redesign)

## Impact

- Affects `@hominem/db` schema definitions primarily
- May require updates to any code importing from `tables.ts` directly
- Drizzle ORM queries using camelCase need updates to snake_case
- New schema is thinner, more robust, and consolidated
- No migration concerns - pure schema creation

## Final Schema Tables

### Core Tables
| Table | Description |
|-------|-------------|
| `users` | Canonical user identity |
| `user_session` | Better-auth sessions |
| `user_account` | OAuth/account linking |
| `user_passkey` | Passkey credentials |
| `user_api_key` | API keys |
| `user_verification` | Email verification |
| `user_device_code` | Device code auth |

### Unified Domain Tables
| Table | Merged From |
|-------|-------------|
| `persons` | people, contacts, person, relationships |
| `users_people` | NEW - join table linking users to persons (relationship_type) |
| `health_records` | health, healthMetrics, healthLog, healthWeight, healthSleep, healthBloodPressure, healthHeartRate |
| `log` | activity_log, audit_log |

### Music & Podcasts
| Table | Source | Adds |
|-------|--------|------|
| `music_tracks` | google_music_library_songs, spotify_yourlibrary (tracks) | `source` |
| `music_albums` | spotify_yourlibrary (albums) | `source` |
| `music_artists` | spotify_yourlibrary (artists) | `source` |
| `music_shows` | spotify_yourlibrary (shows) | `source` |
| `music_episodes` | spotify_yourlibrary (episodes) | `source` |
| `music_playlists` | google_playlists, spotify_playlists | `source` |
| `music_library` | spotify_yourlibrary | `source` |
| `music_liked` | google_your_liked_content | `source` |
| `music_listening` | musicListeningLog, podcastPlays | `source` |

### Video & Movies
| Table | Source | Adds |
|-------|--------|------|
| `video_viewings` | google_videos_log, movieViewings | standardize, add `content_type` column (movie/youtube/tiktok/etc) |
| `video_channels` | google_channel, google_your_follows | standardize, add `content_type` column |
| `video_comments` | google_comments | `source` |
| `entertainment_backlog` | entertainmentBacklog | standardize |

### Social & Messaging
| Table | Source | Adds |
|-------|--------|------|
| `social_posts` | socialPosts | standardize |
| `social_likes` | socialLikes | standardize |
| `social_comments` | socialComments | standardize |
| `social_connections` | socialConnections | standardize |
| `social_messages` | socialMessages | standardize |
| `social_follows` | spotify_follow | `source` |
| `subscriptions` | google_subscriptions | `source` |
| `social_chat_messages` | google_live_chats | `source` |

### Travel
| Table | Original |
|-------|----------|
| `travel_trips` | trips |
| `travel_flights` | flight |
| `travel_hotels` | hotel |
| `travel_transport` | transport |
| `travel_routes` | transportationRoutes |
| `travel_route_waypoints` | routeWaypoints |
| `travel_attendees` | tripAttendees |
| `locations` | locations |

### Places
| Table | Original |
|-------|----------|
| `places` | place |

### Career & Jobs
| Table | Original |
|-------|----------|
| `career_companies` | companies |
| `career_jobs` | jobs |
| `career_applications` | jobApplications |
| `career_interviews` | interviews |
| `career_interviewers` | interviewInterviewers |
| `career_stages` | applicationStages |
| `career_work_experiences` | workExperiences |
| `career_employers` | careerEmployers |
| `skills` | skills |
| `user_skills` | userSkills |

### Calendar & Events
| Table | Original |
|-------|----------|
| `calendar_events` | events, calendarEvents, networkingEvents, lifeEvents, concerts, activities | standardize, add `event_type` column |
| `calendar_event_types` | calendarEventTypes |
| `calendar_attendees` | networkingEventAttendees | join between calendar_events and persons |
| `event_transactions` | eventsTransactions |

### Finance (Prefix with finance_)
| Table | Original |
|-------|----------|
| `finance_transactions` | transactions |
| `finance_accounts` | accounts |
| `finance_goals` | budget_goals |
| `finance_institutions` | financial_institutions |
| `finance_plaid_items` | plaid_items |
| `finance_income` | incomeLog |
| `finance_credit_scores` | creditScores |
| `finance_expenses` | financeExpenses |
| `finance_runway` | runway |
| `finance_account_aliases` | accountAliases |

### Payment & Devices
| Table | Source | Adds |
|-------|--------|------|
| `payment_transactions` | google_money_sends_and_requests | `provider` |
| `payment_methods` | spotify_payments, paymentMethods | `provider` |
| `payment_rewards` | google_cashback_rewards | `source` |
| `devices` | google_mobile_devices | `source` |
| `notification_tokens` | google_notification_tokens | `provider` |
| `provider_accounts` | google_account | `provider` |

### Saved Content
| Table | Source | Adds |
|-------|--------|------|
| `bookmarks` | bookmark | standardize |
| `reading_lists` | google_reading_list | `source` |
| `reading_log` | readingLog | standardize |
| `shopping_lists` | google_my_shopping_list | `source` |
| `saved_recipes` | google_my_cookbook | `source` |
| `saved_jobs` | google_favorite_jobs | `source` |
| `saved_images` | google_favorite_images | `source` |
| `saved_content` | google_saves_data | `source` |

### Notes
| Table | Source | Adds |
|-------|--------|------|
| `notes` | notes, notesUnified, apple_notes_details | standardize, `source: 'apple'`, `is_locked`, `shared_with` |

### Goals & Tasks
| Table | Original |
|-------|----------|
| `goals` | goals |
| `key_results` | keyResults |
| `tasks` | tasks |
| `task_lists` | taskLists |
| `projects` | projects |
| `objectives` | objectives |

### Possessions
| Table | Original |
|-------|----------|
| `possessions` | possessions |
| `possession_containers` | possessionsContainers |
| `possession_usage` | possessionsUsage |

### Surveys
| Table | Original |
|-------|----------|
| `surveys` | surveys |
| `survey_options` | surveyOptions |
| `survey_votes` | surveyVotes |

### Search & Entities
| Table | Original |
|-------|----------|
| `user_tags` | NEW - unified tagging + categories with sharing (owner_id, group, emoji_image_url) |
| `tag_shares` | NEW - join table for sharing tags (tag_id, user_id) |
| `tagged_items` | NEW - polymorphic join table (tag_id, entity_type, entity_id) |
| `search_index` | searchIndex |
| `searches` | searches |
| `entities` | entities |
| `entity_relationships` | entityRelationships |

### MCP & Tools
| Table | Original |
|-------|----------|
| `mcp_sessions` | mcpSessions |
| `mcp_tool_executions` | mcpToolExecutions |
| `mcp_user_context` | mcpUserContext |

### Education & Life
| Table | Original |
|-------|----------|
| `schools` | schools |
| `residences` | residences |
| `years` | years |

### Other
| Table | Original |
|-------|----------|
| `documents` | documents |
| `tags` | tags |
| `phone_numbers` | phoneNumbers |
| `social_media` | social_media |
| `domains` | domains |
| `services` | services |
| `personal_sizes` | personalSizes |
| `games` | games |
| `tarot_readings` | tarotReadings |
| `amazon_purchases` | amazonPurchases |

### Archive (Low-value tables to remove or archive)
- `google_australia` - unclear purpose
- `google_default_list` - generic catch-all
- `google_tombstones` - deletion metadata
- `google_not_interested_setting` - YouTube preference
- `google_channel_images` - rarely used
- `google_channel_feature_data` - rarely used
- `google_channel_page_settings` - rarely used
- `google_channel_url_configs` - rarely used
- `google_channel_community_moderation_settings` - rarely used
- `google_info` / `google_members` / `google_recently_viewed_groups` - Google Groups
- `google_activities_a_list_of_google_services_accessed_by` - activity log
- `google_your_personalization_feedback` - preference data
- `spotifyYourlibrary` - duplicate
- `spatialRefSys` - system table
- `gooseDbVersion` - system table
- `schemaMigrations` - system table
- `financialAccountsSqlite` - legacy
- `transportationSqlite` - legacy
- `hotelsSqlite` - legacy
- `activityTypes` - lookup
- `mealTypes` - lookup
- `transportationTypes` - lookup
