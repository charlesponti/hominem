## 1. Atlas Setup

- [ ] 1.1 Install Atlas CLI (run `curl -sSf https://atlasgo.sh | sh` or `brew install ariga/tap/atlas`)
- [ ] 1.2 Create `packages/db/atlas.yaml` with PostgreSQL configuration
- [ ] 1.3 Run `atlas schema inspect --url $DATABASE_URL > packages/db/schema.sql` to introspect production DB
- [ ] 1.4 Run `atlas schema apply --dry-run` to verify schema matches
- [ ] 1.5 Commit `packages/db/schema.sql` to repository

## 2. Kysely Setup

- [ ] 2.1 Add dependencies: `bun add kysely pg`
- [ ] 2.2 Add dev dependency: `bun add -d kysely-codegen`
- [ ] 2.3 Run `kysely-codegen --dialect postgres --out-file packages/db/src/types/database.ts` to generate types
- [ ] 2.4 Create `packages/db/src/db.ts` with Kysely instance (singleton, connection pool)
- [ ] 2.5 Export Kysely instance from `packages/db/src/index.ts`
- [ ] 2.6 Run `bun run build` to verify types compile
- [ ] 2.7 Commit generated types to repository

## 3. Tasks Domain Migration

- [ ] 3.1 Read existing `packages/db/src/services/tasks.service.ts`
- [ ] 3.2 Read RPC contract in `packages/hono-rpc/src/routes/tasks.ts`
- [ ] 3.3 Write Kysely queries in `services/api/src/routes/tasks.ts` to satisfy RPC contract
- [ ] 3.4 Run integration tests: `bun test packages/db/src/services/tasks.service.integration.test.ts`
- [ ] 3.5 Verify tests pass with new Kysely queries

## 4. Bookmarks Domain Migration

- [ ] 4.1 Read existing `packages/db/src/services/bookmarks.service.ts`
- [ ] 4.2 Read RPC contract in `packages/hono-rpc/src/routes/bookmarks.ts`
- [ ] 4.3 Write Kysely queries in `services/api/src/routes/bookmarks.ts`
- [ ] 4.4 Run integration tests: `bun test packages/db/src/services/bookmarks.service.integration.test.ts`

## 5. Calendar Domain Migration

- [ ] 5.1 Read existing `packages/db/src/services/calendar.service.ts`
- [ ] 5.2 Read RPC contract in `packages/hono-rpc/src/routes/calendar.ts`
- [ ] 5.3 Write Kysely queries in `services/api/src/routes/calendar.ts`
- [ ] 5.4 Run integration tests: `bun test packages/db/src/services/calendar.service.integration.test.ts`

## 6. Finance Domain Migration

- [ ] 6.1 Read existing finance services (`accounts.service.ts`, `transactions.service.ts`, `categories.service.ts`)
- [ ] 6.2 Read RPC contracts in `packages/hono-rpc/src/routes/finance.*`
- [ ] 6.3 Write Kysely queries in finance route handlers
- [ ] 6.4 Run integration tests

## 7. Possessions Domain Migration

- [ ] 7.1 Read existing `packages/db/src/services/possessions.service.ts`
- [ ] 7.2 Read RPC contract in `packages/hono-rpc/src/routes/possessions.ts`
- [ ] 7.3 Write Kysely queries in `services/api/src/routes/possessions.ts`
- [ ] 7.4 Run integration tests: `bun test packages/db/src/services/possessions.service.integration.test.ts`

## 8. Persons Domain Migration

- [ ] 8.1 Read existing `packages/db/src/services/persons.service.ts`
- [ ] 8.2 Read RPC contract in `packages/hono-rpc/src/routes/people.ts`
- [ ] 8.3 Write Kysely queries in `services/api/src/routes/people.ts`
- [ ] 8.4 Run integration tests

## 9. Tags Domain Migration

- [ ] 9.1 Read existing `packages/db/src/services/tags.service.ts`
- [ ] 9.2 Read RPC contract in `packages/hono-rpc/src/routes/tags.ts`
- [ ] 9.3 Write Kysely queries in `services/api/src/routes/tags.ts`
- [ ] 9.4 Run integration tests: `bun test packages/db/src/services/tags.service.integration.test.ts`

## 10. Remove Drizzle

- [ ] 10.1 Remove dependencies: `bun remove drizzle-orm drizzle-zod drizzle-kit`
- [ ] 10.2 Delete schema files: `rm packages/db/src/schema/*.ts`
- [ ] 10.3 Delete migrations directory: `rm -rf packages/db/src/migrations/`
- [ ] 10.4 Delete service files: `rm packages/db/src/services/*.service.ts`
- [ ] 10.5 Clean up `packages/db/src/index.ts` exports (keep db instance, remove schema exports)
- [ ] 10.6 Update `packages/db/package.json` (remove drizzle scripts, add kysely scripts)

## 11. Verify

- [ ] 11.1 Run full build: `bun run build`
- [ ] 11.2 Run full test suite: `bun run test`
- [ ] 11.3 Run typecheck: `bun run typecheck`
- [ ] 11.4 Run lint: `bun run lint --parallel`
- [ ] 11.5 Verify staging deployment
- [ ] 11.6 Verify production deployment
