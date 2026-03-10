## Context

Currently `@hominem/services` is a mixed bag:
- **DB-dependent**: bookmarks, tasks, people, possessions, tags, google-calendar, vector
- **Pure (no DB)**: voice-transcription, voice-speech

When apps like `notes` import `@hominem/services` for voice features, they pull in `@hominem/db` as a transitive dependency. Since `@hominem/db` checks for `DATABASE_URL` at import time, apps fail without it.

Architecture principle: Only `services/api` should use `@hominem/db` directly. Apps access data via RPC.

## Goals / Non-Goals

**Goals:**
- Remove `@hominem/db` dependency from `@hominem/services`
- Allow apps to use `@hominem/services` for voice features without DATABASE_URL
- Keep all DB-dependent services accessible from `@hominem/db`

**Non-Goals:**
- Create new packages (keep it simple)
- Add new functionality
- Change how services are implemented

## Decisions

### D1: Move services to @hominem/db
**Decision**: Move all DB-dependent services from `@hominem/services` to `@hominem/db`.

**Rationale**:
- `@hominem/db` is already the source of truth for DB schema
- Only API server uses `@hominem/db`, so having services there is acceptable
- Apps use RPC for data access anyway

**Alternatives considered**:
- Split into separate packages per domain: Rejected (too many packages)
- Lazy DB initialization: Workaround, not a real fix

### D2: Keep voice services in @hominem/services
**Decision**: Keep voice-transcription and voice-speech in `@hominem/services`.

**Rationale**:
- They don't need DB
- They're pure business logic (OpenAI API calls)
- Apps can import them safely

## Risks / Trade-offs

- **Large @hominem/db package**: Acceptable - only API server uses it
- **Import changes**: `services/api` will need to update imports from `@hominem/services` to `@hominem/db` for DB services. This is a breaking change but aligns with the intended architecture.

## Migration Plan

1. Move service files from `packages/services/src/` to `packages/db/src/`
2. Update exports in `@hominem/db` package
3. Remove DB-dependent exports from `@hominem/services`
4. Update imports in `services/api`
5. Verify `apps/notes` works without DATABASE_URL

## Open Questions

None - the approach is straightforward.
