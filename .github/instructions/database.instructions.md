---
applyTo: 'packages/db/**'
---

# Database

## Modifying the Database

- Migrations live in `packages/db/migrations/` as SQL files.
- Use Goose format blocks: `-- +goose Up` and `-- +goose Down`.
- Apply migrations with `DATABASE_URL=... bun run --filter @hominem/db goose:up`.
- Check status with `DATABASE_URL=... bun run --filter @hominem/db goose:status`.
- Baseline migration can be introspected from an existing database with `DATABASE_URL=... bun run --filter @hominem/db goose:baseline:pull`.
- Follow Expand -> Backfill -> Contract for zero-downtime changes.
- Avoid destructive statements (`DROP COLUMN`, `DROP TABLE`, type rewrites) in regular migrations.
- Use parameterized queries.
