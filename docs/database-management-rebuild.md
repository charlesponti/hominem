# Database Management Rebuild

## Goal

Keep Goose and rebuild the workflow around it so migrations are explicit, reproducible, and validated from a fresh database in local development and CI.

## Why We Are Rebuilding The Workflow

The current setup has real strengths, but the workflow around it has been too loose:

- the migration history begins with a large dump-style baseline in [packages/db/migrations/20260309120000_schema_baseline.sql](/Users/charlesponti/Developer/hominem/packages/db/migrations/20260309120000_schema_baseline.sql)
- local and CI bootstrap have depended on reused test schemas and ambient environment state
- fresh-database validation has not been the default path
- type generation has depended on mutable database state instead of verified bootstrap

The problem is not Goose itself. The problem is that we have not treated migration execution, reset, verification, and test bootstrap as one system.

## Design Principles

1. Goose is the only migration runner.
2. Migrations are small, hand-authored SQL files.
3. Empty-database bootstrap must always pass.
4. Integration and contract tests run against disposable databases.
5. Type generation follows a successful migration run.
6. Local commands and CI share the same scripts.

## Target Repository Layout

```text
packages/db/
  migrations/
    20260309120000_schema_baseline.sql
    2026xxxxxxxxxx_add_foo.sql
    2026xxxxxxxxxx_add_bar.sql
  src/
    db.ts
    env.ts
    index.ts
    services/
    test/
    types/
      database.ts
scripts/
  run-goose.sh
  reset-database.sh
  with-fresh-test-db.sh
  verify-goose-fresh-db.sh
```

`packages/db/migrations` is authoritative. `schema.sql` remains a reference artifact until the migration history is cleaned up.

## Migration Rules

Each Goose migration should be small and bounded.

Good:

- add `users.last_seen_at`
- create `auth_sessions`
- add `notes_tenant_policy`
- create `ensure_future_partitions()`

Bad:

- full schema baseline
- all auth changes
- database update

Rules:

- one concern per migration
- forward SQL in `-- +goose Up`
- explicit rollback SQL in `-- +goose Down`
- names should be stable and descriptive
- empty-database bootstrap is the acceptance test

## Local Workflow

### Daily Developer Flow

1. start local infra with `make dev-up`
2. create a migration with `make db-new-migration NAME=add_foo`
3. apply it with `make db-migrate`
4. verify bootstrap from a fresh disposable database with `make db-verify-fresh`
5. regenerate Kysely types with `make db-generate-types`
6. run tests

### Reset And Recovery

- `make db-reset-dev` drops and recreates the development database, then migrates it
- `make db-reset-test` drops and recreates the shared local test database, then migrates it
- `make db-reset-all` does both

These are recovery tools. The preferred integration-test path is disposable databases, not shared reset loops.

## Test Database Architecture

The Postgres container can be long-lived. The test database inside it should not be.

Integration and contract tests should:

1. create a fresh disposable database
2. run Goose migrations into it
3. execute the suite with `DATABASE_URL` pointed at that database
4. drop it afterward

That is now the model for [scripts/run-integration-tests.sh](/Users/charlesponti/Developer/hominem/scripts/run-integration-tests.sh) and [scripts/with-fresh-test-db.sh](/Users/charlesponti/Developer/hominem/scripts/with-fresh-test-db.sh).

## CI Requirements

CI must prove three things:

1. migration SQL passes lint
2. Goose can bootstrap a fresh database with no pending migrations left behind
3. app and service tests run against migrated databases with explicit environment variables

The fresh-bootstrap check is handled by [scripts/verify-goose-fresh-db.sh](/Users/charlesponti/Developer/hominem/scripts/verify-goose-fresh-db.sh).

## Migration Cleanup Plan

We are keeping Goose, but we should still improve the migration history over time:

1. freeze the dump-style baseline
2. add only small migrations after it
3. once the workflow is stable, replace the dump baseline with a cleaner bootstrappable baseline in a controlled migration-history reset
4. regenerate types only from verified databases
