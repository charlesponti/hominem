## Context

### Current State

Our database layer uses Drizzle ORM with:
- 15+ schema files in `packages/db/src/schema/`
- 72 sequential migration files in `packages/db/src/migrations/`
- A service layer wrapping queries in `packages/db/src/services/`
- TypeScript type-checking that consumes ~165MB memory and takes 0.74s on cold runs

The API layer (`services/api`) accesses data through these service functions, which in turn use Drizzle's query builder.

### Constraints

- **RPC contracts must remain unchanged** — the public API between `@hominem/hono-rpc` and clients cannot change
- **Production database must be preserved** — we cannot lose data during migration
- **Big-bang switchover** — the user requested a "nuke and rebuild" approach rather than incremental migration

### Stakeholders

- Backend developers (primary): Will need to learn Kysely API
- Frontend developers (secondary): No changes; RPC contracts unchanged
- DevOps (tertiary): New migration pipeline with Atlas

## Goals / Non-Goals

### Goals

1. **Eliminate type-checking overhead** — Reduce memory usage from ~165MB to ~65MB, eliminate editor lag
2. **Enable branch-based schema development** — Developers can work on feature branches with independent database states
3. **Maintain RPC contract compatibility** — All existing API contracts work identically after migration
4. **Single source of truth for schema** — One `schema.sql` file instead of 72 migration files

### Non-Goals

- **Incremental migration** — We are doing a big-bang switchover as requested
- **Support for multiple database engines** — PostgreSQL only for now
- **Backward compatibility with Drizzle** — Once migrated, no Drizzle code remains

## Decisions

### Decision 1: Introspect Database, Not Schema Files

**Choice**: Generate `schema.sql` by introspecting the current production database using Atlas, not by converting Drizzle schema files.

**Rationale**: 
- The production database is the true source of truth
- Drizzle schema files may have drift from actual database state
- Atlas's `schema inspect` captures the complete state including any manual modifications

**Alternative considered**: Convert Drizzle schema files to SQL manually. Rejected because it's error-prone and doesn't capture any drift.

### Decision 2: Generate Types from Database, Not Schema Files

**Choice**: Use `kysely-codegen` to generate TypeScript types by introspecting the database schema.

**Rationale**:
- Types always match the actual database state
- No manual synchronization needed between schema and types
- This is the recommended Kysely approach and works well in production

**Alternative considered**: Write types manually. Rejected because it's error-prone and doesn't scale.

### Decision 3: Queries in RPC Routes, Not Service Layer

**Choice**: Move queries directly into RPC route handlers (`services/api/src/routes/*`), removing the service layer entirely.

**Rationale**:
- Kysely's strength is direct SQL queries; abstraction hides that
- Fewer indirection layers = better performance
- Queries colocated with their use cases are easier to understand and modify
- The RPC contracts already define the boundary; services are redundant

**Alternative considered**: Keep a thin query module layer. Rejected because it adds indirection without benefit — queries aren't genuinely reused across multiple routes.

### Decision 4: Big-Bang Switchover

**Choice**: Migrate everything in one release, then delete Drizzle code.

**Rationale**:
- User explicitly requested "nuke and build from scratch" approach
- Avoids long period of maintaining two implementations
- Clear before/after state

**Alternative considered**: Incremental migration (one domain at a time). Not chosen per user request.

### Decision 5: Keep Atlas CLI as Dev Dependency

**Choice**: Install Atlas CLI as a dev dependency, not a runtime dependency.

**Rationale**:
- Atlas is used for schema planning and migration, not at runtime
- Reduces production image size
- Migration runs in CI/CD, not in the application

## Risks / Trade-offs

### Risk: Type Generation Drift

**Risk**: Database schema changes between codegen run and deployment could cause type mismatches.

**Mitigation**: 
- Run `kysely-codegen` as part of the build process, not just once
- Include generated types in version control so CI can detect drift
- Add a CI check that verifies types match database before deployment

### Risk: Query Performance Regression

**Risk**: Kysely queries might have different performance characteristics than Drizzle.

**Mitigation**:
- All existing queries are reviewed and tested during migration
- Integration tests run against real database to catch performance issues
- Kysely compiles to raw SQL, so performance should be equivalent or better

### Risk: Developer Learning Curve

**Risk**: Team needs to learn Kysely API.

**Mitigation**:
- Kysely API is intuitive and SQL-like
- Queries are colocated in routes, making them easy to understand in context
- The migration includes updating any documentation/examples

### Risk: Breaking the Build

**Risk**: During migration, imports from `@hominem/db/services/*` break before queries are moved.

**Mitigation**:
- Phase the migration: first add Kysely queries alongside existing services
- Then update route imports
- Then delete service files
- Full test suite runs between each phase

### Risk: Data Loss

**Risk**: Something goes wrong during schema migration.

**Mitigation**:
- Atlas generates idempotent diffs — running twice produces same result
- Backup database before applying schema changes
- Atlas's dry-run mode shows exact changes before applying

## Migration Plan

### Phase 1: Atlas Setup (Day 1)

1. Install Atlas CLI
2. Create `atlas.yaml` configuration
3. Introspect production database: `atlas schema inspect --url $DATABASE_URL > schema.sql`
4. Verify: `atlas schema apply --dry-run` shows no changes needed
5. Commit `schema.sql` to repository

### Phase 2: Kysely Types (Day 1-2)

1. Add dependencies: `bun add kysely pg && bun add -d kysely-codegen`
2. Generate types: `kysely-codegen --dialect postgres --out-file src/types/database.ts`
3. Create `src/db.ts` with Kysely instance
4. Verify: `bun run build` succeeds
5. Commit generated types

### Phase 3: Migrate Queries (Day 2-5)

For each domain (tasks, bookmarks, calendar, finance, possessions, persons, tags):

1. Read existing service query in `services/*.ts`
2. Write equivalent Kysely query in route handler
3. Run integration tests
4. Verify against test database
5. Deploy

### Phase 4: Remove Drizzle (Day 5-6)

1. Remove dependencies: `bun remove drizzle-orm drizzle-zod drizzle-kit`
2. Delete schema files: `rm packages/db/src/schema/*.ts`
3. Delete migrations: `rm -rf packages/db/src/migrations/`
4. Delete service files: `rm packages/db/src/services/*.ts`
5. Clean up exports in `packages/db/src/index.ts`
6. Run full test suite: `bun run test`
7. Run typecheck: `bun run typecheck`

### Phase 5: Verify Production (Day 6)

1. Deploy to staging
2. Run full integration test suite
3. Deploy to production
4. Monitor for issues

## Open Questions

1. **Should we keep the `@hominem/db` package at all?** 
   - Alternative: Move Kysely instance and types directly into `services/api`
   - Current thinking: Keep package for now; easier to maintain DB connection logic in one place

2. **How do we handle the migration in CI/CD?**
   - Need to decide: declarative (`atlas schema apply`) or versioned (`atlas migrate apply`)
   - Current thinking: Declarative is simpler and matches our goals

3. **Should we use Atlas Cloud for drift detection?**
   - Alternative: Just use CLI for manual checks
   - Current thinking: Not needed initially; can add later if desired
