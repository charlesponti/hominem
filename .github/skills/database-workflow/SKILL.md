---
name: database-workflow
description: Use for `packages/db/**` changes. Covers Goose migrations, safe schema evolution, and validation.
---

# Database Workflow

## Rules

- Keep migrations in `packages/db/migrations/` as SQL files.
- Use Goose blocks: `-- +goose Up` and `-- +goose Down`.
- Apply migrations with `DATABASE_URL=... bun run --filter @hominem/db goose:up`.
- Check status with `DATABASE_URL=... bun run --filter @hominem/db goose:status`.
- Use `goose:baseline:pull` only when baselining an existing database.
- Follow Expand -> Backfill -> Contract for zero-downtime changes.
- Avoid destructive statements such as `DROP COLUMN`, `DROP TABLE`, and type rewrites in normal migrations.
- Use parameterized queries.
