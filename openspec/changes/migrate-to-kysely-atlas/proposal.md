## Why

Our database layer is showing signs of strain that will only worsen as the project grows. TypeScript type-checking in the `@hominem/db` package consumes ~165MB of memory and takes 0.74s on cold runs, with 112,492 lines of generated type definitions. Editor lag after typing `.` on database objects is 3-5 seconds. This is a daily tax on developer velocity.

Additionally, our 72 sequential migration files create a linear, fragile history that doesn't support the branch-based development model we want. Adding a column to `tasks` in two feature branches means migration conflicts that require manual resolution and carry production risk.

Kysely + Atlas solves both problems: Atlas provides declarative, diff-based migrations with branch support, and Kysely provides type-safe SQL queries with linear type-checking performance. This is the stack used by Vercel, Deno, Maersk, and Cal.com in production.

## What Changes

### Architecture Changes

- **Replace Drizzle ORM with Kysely query builder** in `@hominem/db`
- **Replace Drizzle migrations with Atlas declarative schema** (`schema.sql` as single source of truth)
- **Remove the service layer abstraction** — move queries directly into RPC route handlers
- **Generate types from database** using `kysely-codegen` instead of Drizzle's `$inferSelect`

### Migration Approach: Nuke and Rebuild

This is a big-bang switchover:

1. **Introspect current database** → Generate `schema.sql` via Atlas
2. **Generate Kysely types** → `kysely-codegen` from database schema
3. **Write queries in RPC layer** → Satisfy existing RPC contracts with Kysely queries
4. **Remove Drizzle** → Delete `drizzle-orm`, `drizzle-kit`, schema files, migrations

### Breaking Changes

- **BREAKING**: Remove all imports from `@hominem/db/services/*` — queries now live in RPC routes
- **BREAKING**: Remove `drizzle-orm` and `drizzle-kit` dependencies
- **BREAKING**: Database queries use Kysely API (fluent, SQL-like) instead of Drizzle query builder API
- **BREAKING**: Schema defined in `schema.sql` (Atlas) instead of TypeScript files (`schema/*.ts`)

### New Capabilities

- `db-migration-atlas`: Declarative schema management with Atlas
- `db-query-kysely`: Type-safe SQL query builder with linear type performance

## Capabilities

### New Capabilities

- `db-migration-atlas`: Declarative schema management replacing Drizzle's sequential migrations
- `db-query-kysely`: Type-safe SQL query builder with improved type-checking performance

### Modified Capabilities

- None. The RPC contracts remain unchanged — only the implementation behind those contracts changes from Drizzle services to Kysely queries.

## Impact

### Affected Code

- `packages/db/` — Full rewrite: remove Drizzle, add Kysely, add Atlas
- `services/api/src/routes/*` — Move queries from `@hominem/db/services/*` into route handlers
- `packages/hono-rpc/` — No changes; contracts remain the same

### Dependencies Added

- `kysely` — Query builder
- `pg` — PostgreSQL driver
- `kysely-codegen` — Type generation from database schema
- `atlas` — CLI for schema management (dev dependency)

### Dependencies Removed

- `drizzle-orm`
- `drizzle-zod`
- `drizzle-kit`

### Systems Affected

- Database migration pipeline (Drizzle → Atlas)
- TypeScript compilation (expect ~60% reduction in type-checking memory)
- Developer experience (faster editor completions, no migration conflicts)
