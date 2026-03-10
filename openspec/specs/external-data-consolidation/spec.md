# external-data-consolidation Specification

## Purpose
TBD - created by archiving change phased-db-redesign. Update Purpose after archive.
## Requirements
### Requirement: Music tables with source column
Music-related tables MUST use `music_` prefix with a `source` column for provider discrimination.

#### Scenario: Spotify tracks imported
- **WHEN** tracks from Spotify are stored
- **THEN** record created in `music_tracks` with source = 'spotify'

#### Scenario: Spotify albums imported
- **WHEN** albums from Spotify are stored
- **THEN** record created in `music_albums` with source = 'spotify'

#### Scenario: Spotify artists imported
- **WHEN** artists from Spotify are stored
- **THEN** record created in `music_artists` with source = 'spotify'

#### Scenario: Spotify shows imported
- **WHEN** shows from Spotify are stored
- **THEN** record created in `music_shows` with source = 'spotify'

#### Scenario: Spotify episodes imported
- **WHEN** episodes from Spotify are stored
- **THEN** record created in `music_episodes` with source = 'spotify'

#### Scenario: YouTube playlist imported
- **WHEN** playlist from YouTube Music is stored
- **THEN** record created in `music_playlists` with source = 'youtube'

### Requirement: Video tables with source column
Video-related tables MUST use `video_` prefix with a `source` column.

#### Scenario: YouTube watch history imported
- **WHEN** watch history from YouTube is stored
- **THEN** record created in `video_watch_history` with source = 'youtube'

#### Scenario: YouTube channel subscription
- **WHEN** YouTube channel subscription is stored
- **THEN** record created in `video_subscriptions` with source = 'youtube'

### Requirement: Social tables with source column
Social-related tables MUST use `social_` prefix with a `source` column.

#### Scenario: Spotify follows
- **WHEN** Spotify artist/user follow is stored
- **THEN** record created in `social_follows` with source = 'spotify'

### Requirement: Device tables with source column
Device tables MUST use `devices` with a `source` column.

#### Scenario: Google device registered
- **WHEN** Android device is registered
- **THEN** record created in `devices` with source = 'google'

### Requirement: Payment tables with provider column
Payment-related tables MUST use generic names with a `provider` column.

#### Scenario: Google Pay transaction
- **WHEN** Google Pay transaction is stored
- **THEN** record created in `payment_transactions` with provider = 'google_pay'

#### Scenario: Spotify payment method
- **WHEN** Spotify payment method is stored
- **THEN** record created in `payment_methods` with provider = 'spotify'

### Requirement: Saved content tables with source column
Saved content tables MUST use generic names (`saved_*`) with a `source` column.

#### Scenario: Reading list imported
- **WHEN** Chrome reading list is stored
- **THEN** record created in `reading_lists` with source = 'chrome'

### Requirement: Unified notes table
Apple notes MUST be merged into a unified `notes` table with source column.

#### Scenario: Apple note imported
- **WHEN** note from Apple Notes is stored
- **THEN** record created in `notes` with source = 'apple'

### Requirement: Index on source columns
All tables with source/platform/provider columns MUST have indices for efficient filtering.

#### Scenario: Query all YouTube data
- **WHEN** querying video from YouTube
- **THEN** index on (user_id, source) enables efficient filtering

