---
applyTo: 'packages/db/**'
---

# Database

## Modifying the Database

- Modify schema in `packages/db/src/schema/`.
- Generate migrations with `bun run db:generate`.
- Apply migrations with `bun run db:migrate`.
- Do not manually edit SQL migration files.
- Use parameterized queries.
