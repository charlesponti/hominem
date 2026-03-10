## Why

Apps like `notes` use `@hominem/services` for voice features (speech, transcription) but are forced to have `DATABASE_URL` configured because `@hominem/services` depends on `@hominem/db`. This violates the principle that web apps should access data via RPC, not directly.

## What Changes

- Move database-dependent services from `@hominem/services` to `@hominem/db`:
  - `bookmarks.service`
  - `tasks.service`
  - `people.service`
  - `possessions.service`
  - `tags.service`
  - `google-calendar.service`
  - `vector.service`
- Keep pure business logic services in `@hominem/services`:
  - `voice-transcription.service`
  - `voice-speech.service`
- Export services from `@hominem/db` instead of `@hominem/services`
- Update imports in `services/api` to use `@hominem/db` for DB-dependent services

## Capabilities

### New Capabilities
- None - this is a refactoring with no new functionality

### Modified Capabilities
- None - existing specs remain unchanged

## Impact

- `@hominem/services`: No longer depends on `@hominem/db`, safe for apps to use
- `@hominem/db`: Now exports database-dependent services
- `apps/notes`: Can use `@hominem/services` without DATABASE_URL
- `services/api`: Already uses `@hominem/db`, imports remain valid
- `packages/notes`: Not affected (uses RPC for data)
