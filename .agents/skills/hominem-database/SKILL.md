---
name: hominem-database
description: Safely inspect, compare, plan, and change the Hominem database schema. Use for live warehouse-to-Postgres schema comparisons, Goose migration authoring or execution, database code generation, migration validation, rollback checks, and schema-change verification.
---

# Hominem Database

Use this skill for database work in the Hominem monorepo. Treat live database introspection as authoritative for comparisons and treat Goose migrations plus generated Kysely types as the authoritative implementation path for schema changes.

Choose the focused reference before acting:

- For warehouse SQLite versus Hominem Postgres comparisons, read [schema-diff.md](references/schema-diff.md) and use [pull-schemas.sh](scripts/pull-schemas.sh).
- For any change under `packages/db/migrations/`, read [migrate.md](references/migrate.md).
- For a task that both compares and changes schema, read both references in that order: diff first, migration second.

## Core rules

- Inspect live state before deciding whether a table or column exists. Do not infer current production schema from migration history alone.
- Keep one schema concern per migration. Use timestamped flat Goose filenames with matching `Up` and `Down` sections.
- Create migrations with `just db create <domain_change>`; never hand-pick timestamps or create files outside `packages/db/migrations/`.
- Never hand-edit `packages/db/src/types/database.ts`; regenerate it from the database after applying migrations.
- Do not start database containers or long-running services automatically. If required infrastructure is unavailable, report the exact prerequisite.
- Never expose database URLs, credentials, row data, or production records in output. Snapshot files are scratch artifacts and must remain uncommitted.
- Treat `just db validate` as an integration check: it validates Goose files, applies pending migrations, and verifies that no migrations remain pending. It is not read-only.
- Treat rollback as destructive. Use `just db rollback test` for test databases; set `ALLOW_DB_ROLLBACK=1` only when an intentional non-test rollback is approved.
- Validate both migration state and the generated type diff before declaring a schema change complete.

## Completion evidence

Report the relevant command and observed result. For comparisons, include the snapshot paths and live sources inspected. For schema changes, include migration application, code generation, test-database validation, and any unverified production step.
