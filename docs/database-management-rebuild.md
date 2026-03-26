# Database Management Rebuild

## Goal

Replace the current dump-based Goose workflow with a fully free, SQL-first, production-safe system that is deterministic, testable, and maintainable.

The replacement stack is:

- Sqitch for database change management
- `psql` for execution
- pgTAP for database verification
- Kysely for runtime queries
- `kysely-codegen` for generated TypeScript database types
- Docker Postgres for local and CI bootstrap

This document is the source of truth for the replacement architecture.

## Why We Are Replacing The Current System

The current setup has structural flaws:

- The migration history is a single `pg_dump`-style baseline in [packages/db/migrations/20260309120000_schema_baseline.sql](/Users/charlesponti/Developer/hominem/packages/db/migrations/20260309120000_schema_baseline.sql)
- `packages/db` has generated types and runtime code, but no maintained schema source in `src/`
- Local and CI bootstrap depend on migration state and live database state agreeing by accident
- Test databases are reused long enough to accumulate hidden state
- Type generation is downstream of a mutable database, not a validated schema pipeline

The result is drift, unclear ownership, and low confidence.

## Design Principles

The rebuilt system follows these rules:

1. One source of truth

The schema is defined by versioned SQL change scripts and verification scripts in the repo, not by a live database, a dump, or generated types.

2. Forward-only changes

Production schema evolution is additive and reviewed. Rollbacks are operational decisions, not the default development model.

3. Empty-database bootstrap must always work

A brand new Postgres database must be able to reach the current schema using only repo-managed artifacts.

4. Verification is first-class

Every schema change can include verification logic, especially for constraints, policies, functions, and permissions.

5. Test databases are disposable

Integration and contract tests run against fresh databases, not long-lived shared schemas.

6. Runtime types are generated artifacts

`src/types/database.ts` is generated from a migrated database and should never be treated as the schema authoring surface.

## Chosen Stack

### Sqitch

Sqitch is the change-management layer.

Why:

- fully free and open
- mature and battle-tested
- SQL-first
- dependency-aware via `sqitch.plan`
- well-suited for advanced Postgres objects like functions, policies, triggers, extensions, and partition helpers

Sqitch stores deployment intent in:

- `sqitch.plan`
- deploy scripts
- revert scripts
- verify scripts

Unlike timestamp-only migration runners, it models change dependencies explicitly.

### psql

`psql` remains the execution engine for local, CI, and deploy runs. It is the most direct and battle-tested Postgres interface.

### pgTAP

pgTAP is used for database verification.

Use it for:

- schema assertions
- extension availability
- table and column presence
- index expectations
- function signatures
- RLS policies
- partition maintenance helpers

### Kysely + kysely-codegen

Kysely remains the runtime query layer.

`kysely-codegen` remains the type generation tool, but only after schema deployment succeeds against a fresh database.

## Target Repository Layout

The target layout for `packages/db` is:

```text
packages/db/
  README.md
  package.json
  sqitch.conf
  sqitch.plan
  deploy/
    000_extensions.sql
    010_core_functions.sql
    020_users.sql
    030_auth.sql
    040_notes.sql
    050_chat.sql
    ...
  revert/
    000_extensions.sql
    010_core_functions.sql
    020_users.sql
    030_auth.sql
    040_notes.sql
    050_chat.sql
    ...
  verify/
    000_extensions.sql
    010_core_functions.sql
    020_users.sql
    030_auth.sql
    040_notes.sql
    050_chat.sql
    ...
  test/
    pgtap/
      base.sql
      policies.sql
      partitions.sql
  src/
    db.ts
    env.ts
    index.ts
    errors.ts
    services/
    test/
    types/
      database.ts
```

Notes:

- `deploy/`, `revert/`, and `verify/` are authoritative schema-management files
- the current `migrations/` directory is transitional and will be removed after cutover
- the current `schema.sql` file can be retired once the new system is in place

## Change Granularity

Each Sqitch change should be small and bounded.

Good:

- add `users.last_seen_at`
- create `auth_sessions`
- add `notes_tenant_policy`
- create `ensure_future_partitions()`

Bad:

- “full schema baseline”
- “all auth changes”
- “database update”

Rules:

- one concern per change
- changes can depend on prior changes
- names should be stable and descriptive
- verification scripts should assert the change contract

## Schema Organization Strategy

We should organize changes by domain and by object type where it improves clarity.

Recommended sequence:

1. extensions
2. shared helper functions
3. core identity tables
4. domain tables
5. indexes
6. policies and permissions
7. partition maintenance helpers
8. triggers

This keeps dependencies explicit.

Examples:

- `extensions`
- `app-current-user-id-fn`
- `users-table`
- `auth-sessions-table`
- `notes-table`
- `notes-tenant-policy`
- `ensure-future-partitions-fn`

## Local Workflow

### Daily Developer Flow

Normal development:

1. start local infra
2. create or update a Sqitch change
3. deploy to a fresh local development database
4. verify
5. regenerate Kysely types
6. run application tests

### New Schema Change Flow

For a new change:

1. `sqitch add <change-name> -n "<summary>"`
2. write `deploy/<change-name>.sql`
3. write `verify/<change-name>.sql`
4. write `revert/<change-name>.sql` only if we decide to keep reversible dev support
5. deploy to empty local database
6. verify with Sqitch and pgTAP
7. regenerate Kysely types
8. commit all artifacts together

### Recommended Root Commands

The root command surface should become:

- `make db-up`
- `make db-down`
- `make db-reset`
- `make db-dev-create`
- `make db-test-create`
- `make db-deploy`
- `make db-verify`
- `make db-status`
- `make db-typegen`
- `make db-lint`
- `make test:integration`

The current Goose commands should be deprecated and later removed.

## Test Database Architecture

### Principle

The Postgres container can be long-lived. The schema inside it should not be.

Integration and contract tests should create a fresh database per run.

### Recommended Model

Use one running local Postgres container and create disposable databases inside it:

- `hominem_dev_<suffix>`
- `hominem_test_<suffix>`

Per integration run:

1. create database
2. deploy Sqitch plan
3. run verification
4. set `DATABASE_URL` to that database
5. run tests
6. drop database

This removes hidden state and avoids the current “schema exists but migration tool disagrees” problem.

### Why Not Reuse `hominem-test`

Long-lived test schemas create:

- duplicate key conflicts across runs
- stale migration metadata
- dirty tables
- false confidence from partial cleanup

Disposable databases are the correct boundary.

## CI Architecture

CI should validate the database system in distinct steps.

### 1. Schema Deploy Check

Create an empty Postgres database and run:

- `sqitch deploy`
- `sqitch verify`

This proves empty-database bootstrap works.

### 2. Drift Check

After deploy and type generation, CI should verify generated types are current.

Run:

- `kysely-codegen`
- diff check on `packages/db/src/types/database.ts`

If generation changes tracked files, CI fails.

### 3. Integration Test Bootstrap

Before DB-backed tests:

1. create a fresh test database
2. deploy plan
3. verify
4. run tests against that database
5. drop database

### 4. Production Deploy Check

Before applying prod changes:

- `sqitch status`
- `sqitch deploy`
- `sqitch verify`

Production deploys should never rely on local state or generated dump files.

## Verification Strategy

Verification happens at three layers.

### Sqitch verify scripts

Each change includes a verification script that checks its contract.

Examples:

- table exists
- column exists with expected type
- function exists
- index exists
- policy exists

### pgTAP suite

pgTAP covers higher-value invariants across the whole schema.

Examples:

- required extensions installed
- all tenant tables have RLS enabled
- expected policies exist on sensitive tables
- partition helper functions exist
- key indexes exist on hot paths

### Application tests

Service and API integration tests validate behavior on top of a freshly deployed schema.

## Type Generation

Type generation should become a deterministic output of the schema pipeline.

Recommended flow:

1. create fresh dev database
2. `sqitch deploy`
3. `sqitch verify`
4. `kysely-codegen --out-file packages/db/src/types/database.ts`

Rules:

- do not hand-edit generated files
- do not generate from a long-lived developer database
- do not generate before schema verification

## Production Safety Rules

The rebuild should enforce these rules:

- no direct `psql` schema edits against production
- no schema changes outside reviewed SQL files
- no giant baseline dumps after initial cutover
- no “fix it in place” production changes without a tracked change
- no app deploy that depends on unapplied schema changes

For destructive changes:

- use expand-and-contract
- deploy additive schema first
- backfill data separately
- ship code using both shapes if needed
- remove old shape in a later release

## Proposed Transition Plan

This should be done in phases.

### Phase 0: Freeze

Freeze the current Goose baseline workflow.

Rules:

- no new dump-based baseline files
- no more editing `20260309120000_schema_baseline.sql` except emergency unblockers

### Phase 1: Introduce Sqitch Beside Goose

Add:

- `sqitch.conf`
- `sqitch.plan`
- `deploy/`
- `revert/`
- `verify/`
- local scripts for deploy and verify

Do not cut over CI yet.

### Phase 2: Create A Clean Initial Baseline

Build a reviewed initial Sqitch baseline from the current intended schema.

Important:

- do not copy the current dump wholesale
- split it into meaningful deploy units
- create verification scripts for each unit

This is the most labor-intensive step and the most important one.

### Phase 3: Validate From Empty Databases

Create a new CI job that:

1. starts empty Postgres
2. runs `sqitch deploy`
3. runs `sqitch verify`
4. runs type generation verification

This must pass before any cutover.

### Phase 4: Move Test Bootstrap

Switch integration and contract test bootstrap from Goose to fresh-database Sqitch deploys.

This should replace:

- root integration bootstrap
- API integration bootstrap
- any future worker DB-backed test bootstrap

### Phase 5: Switch Deployment Pipeline

Replace Goose in:

- [.github/actions/db-setup/action.yml](/Users/charlesponti/Developer/hominem/.github/actions/db-setup/action.yml)
- [.github/workflows/deploy-db.yml](/Users/charlesponti/Developer/hominem/.github/workflows/deploy-db.yml)

Only do this after Phases 2 through 4 are stable.

### Phase 6: Remove Legacy Artifacts

Remove:

- Goose commands from [packages/db/package.json](/Users/charlesponti/Developer/hominem/packages/db/package.json)
- Goose setup from CI
- `packages/db/migrations/20260309120000_schema_baseline.sql`
- stale schema aliases in [packages/db/tsconfig.json](/Users/charlesponti/Developer/hominem/packages/db/tsconfig.json)
- `schema.sql` if it is no longer part of the new workflow

## Risks

### 1. Baseline Translation Risk

The current dump contains many advanced objects:

- extensions
- functions
- policies
- partitions
- triggers

Translating this into clean Sqitch changes must be done carefully and incrementally.

### 2. Hidden Production Drift

If production has diverged from the checked-in baseline, the first task is to inspect and reconcile intended state before authoring the new Sqitch plan.

### 3. Test Assumptions

Some current integration tests may implicitly depend on reused database state. Disposable-database runs will expose that immediately.

That is a good thing, but it will create short-term cleanup work.

## Immediate Next Steps

1. Add Sqitch tooling and config to the repo without cutting over runtime paths.
2. Define the initial top-level change list for the current schema.
3. Stand up an empty-database CI validation lane for Sqitch.
4. Convert the root integration test bootstrap to disposable databases.
5. Cut API integration tests over first.
6. Only then replace deploy-time Goose usage.

## Recommendation

The correct long-term system for this repo is:

- Sqitch-managed SQL changes
- pgTAP-backed verification
- disposable test databases
- generated Kysely types as downstream artifacts

That gives us a fully free, mature, scalable, Postgres-native workflow without vendor lock-in or paid features.
