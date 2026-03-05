## 1. Move DB-dependent services to @hominem/db

- [x] 1.1 Move `bookmarks.service.ts` from `packages/services/src/` to `packages/db/src/`
- [x] 1.2 Move `tasks.service.ts` from `packages/services/src/` to `packages/db/src/`
- [x] 1.3 Move `people.service.ts` from `packages/services/src/` to `packages/db/src/`
- [x] 1.4 Move `possessions.service.ts` from `packages/services/src/` to `packages/db/src/`
- [x] 1.5 Move `tags.service.ts` from `packages/services/src/` to `packages/db/src/`
- [x] 1.6 Move `google-calendar.service.ts` from `packages/services/src/` to `packages/db/src/`
- [x] 1.7 Move `vector.service.ts` from `packages/services/src/` to `packages/db/src/`

## 2. Update @hominem/db exports

- [x] 2.1 Add service exports to `packages/db/src/index.ts`
- [x] 2.2 Update `packages/db/package.json` exports if needed
- [x] 2.3 Add `@hominem/utils` dependency to `packages/db/package.json` (if needed by moved services)

## 3. Update @hominem/services

- [x] 3.1 Remove DB-dependent service exports from `packages/services/src/index.ts`
- [x] 3.2 Remove `@hominem/db` dependency from `packages/services/package.json`
- [x] 3.3 Remove moved service files from `packages/services/src/`

## 4. Update services/api imports

- [x] 4.1 Update imports in `services/api` to use `@hominem/db` instead of `@hominem/services` for DB services

## 5. Verify

- [x] 5.1 Run `bun run check` to verify no type errors
- [x] 5.2 Verify `apps/notes` starts without DATABASE_URL
- [x] 5.3 Run tests to ensure nothing is broken
