---
name: hominem-database
description: Safely operate Hominem's production Railway PostgreSQL database. Use for backups, extension upgrades, collation maintenance, migrations, verification, monitoring, and recovery; not for building the Foundation image.
---

# Hominem database

Use `$use-railway` for all Railway operations. Resolve the target explicitly on
every run; production's database service is named `database`. Confirm its active
deployment, image digest, volume mount, and `/api/status` response before any
mutation. The current custom-image volume mount is `/var/lib/postgresql`.

## Backup and recovery gate

Before an extension, collation, schema, or image mutation:

1. Record the current successful deployment and image digest, database size,
   extension versions, migration state, active transactions, and API health.
2. Create a custom-format `pg_dump` with `--no-owner --no-privileges` in a
   user-private, non-repository directory. Use restrictive permissions,
   validate it with `pg_restore --list`, record a SHA-256 checksum, and retain
   it for at least 30 days.
3. Create a Railway volume backup when the dashboard and plan permit it. The
   current service is not eligible for Railway PITR because it uses a custom
   image, and Railway volume backups require the appropriate paid plan.

Do not mutate the database until the logical dump verifies. Do not delete,
recreate, detach, or remount the production volume. After an extension upgrade,
restore the dump or pre-change volume before reverting to an older image; an
older image alone can have incompatible extension binaries.

## PostgreSQL maintenance

Use the configured `POSTGRES_USER` and `POSTGRES_DB`; do not assume `postgres`
is the login role. First inspect `pg_extension_update_paths`, active sessions,
invalid indexes, and the exact collation-version mismatch.

- Upgrade only extensions already installed and required by Hominem. `vector`
  is required; PostGIS and pgRouting are available in the image but are not
  installed. Never create them without explicit user approval.
- Run `ALTER EXTENSION vector UPDATE` with a short lock timeout, then read back
  the installed version and validate the HNSW embedding index.
- For collation version changes, identify only user indexes that depend on a
  collated column. Rebuild them with `REINDEX INDEX CONCURRENTLY` and bounded
  lock and statement timeouts. Never use a blanket `REINDEX DATABASE` for this
  production path.
- Refresh each affected database's collation version only after its relevant
  indexes are healthy. Hominem's prior upgrade affected `hominem`, `postgres`,
  and `template1`.

Stop on a lock timeout, unexpected extension path, invalid index, or failed
health check. Do not force a blocking operation.

## Migrations, verification, and monitoring

Production schema changes run through Hominem's `deploy-db-migrations` GitHub
workflow, which invokes `just db migrate`. Inspect the live Goose ledger and
repository migration list first; do not trigger the workflow when nothing is
pending or run ad-hoc local migrations against production.

After any maintenance or deployment, verify:

- terminal Railway deployment status is `SUCCESS`, with the expected image
  digest and existing volume mount;
- PostgreSQL version, required extension versions, collation versions, and
  index validity;
- a transactional temporary-table read/write smoke test and a vector query or
  HNSW-index check;
- `https://api.ponti.io/api/status` reports `database: connected`;
- Railway logs show no new errors or collation warnings, and volume use is
  stable.

Do not claim an image deployment succeeded until Railway reports a terminal
`SUCCESS` status. Keep the backup checksum, rollback image reference, and
maintenance evidence with the change record.
