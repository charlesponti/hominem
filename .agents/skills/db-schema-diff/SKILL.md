---
name: db-schema-diff
description: 'Pull live schema + row-count snapshots from the warehouse SQLite db and the hominem Postgres db, and compare them to plan or verify a warehouse-to-hominem table migration.'
disable-model-invocation: true
---

Use this whenever comparing warehouse's schema (`~/.hominem/warehouse.db`, the personal data
warehouse repo at `~/Developer/warehouse`) against hominem's live Postgres schema — e.g. planning
which warehouse tables still need to migrate, or verifying a migration phase landed correctly.

**Always introspect live database state. Never infer schema from migration files.** A table can
be created in one goose migration and dropped in a later one (`-- +goose Up` DROPs it,
`-- +goose Down` recreates it on rollback) — grepping migration files for `CREATE TABLE` will
match the `Down` section of a table that's actually gone from production. This produced a wrong
migration plan once already: multiple `app.*` tables (health, media, music, people, places,
travel, social, communications) looked live in migration history but had been dropped again by a
later "cleanup unused tables" migration. The only source of truth is the database itself.

## Steps

1. Ensure the hominem Postgres container is running (`docker ps`, look for `foundation-db`;
   `just db status` also confirms connectivity) and the warehouse SQLite file exists at
   `~/.hominem/warehouse.db`.
2. Run the pull script:
   ```
   .agents/skills/db-schema-diff/pull-schemas.sh
   ```
   This writes two timestamped snapshots to `.agents/skills/db-schema-diff/snapshots/`:
   `warehouse_<ts>.md` (every SQLite table, its row count, its columns) and
   `hominem_<ts>.md` (every table across the `app`, `auth`, `public`, and `ops` Postgres
   schemas, row count, columns).
3. Override defaults via env vars if needed:
   - `WAREHOUSE_DB` — path to the warehouse SQLite file (default `~/.hominem/warehouse.db`)
   - `HOMINEM_DATABASE_URL` — Postgres connection string (default
     `postgresql://postgres:postgres@127.0.0.1:5434/hominem`, matching `just/db.just`'s `backup`
     recipe)
   - `OUT_DIR` — where snapshots are written (default `.agents/skills/db-schema-diff/snapshots/`)
4. Read both snapshot files and do the actual comparison in-context: group warehouse tables into
   domains, check whether each domain has a live hominem counterpart (by table existence, not by
   name similarity — a table with a matching name may have a very different shape), and note row
   counts to weight priority (a 500K-row table is a different priority than a 3-row one).
5. Snapshots are gitignored scratch data, not a record to commit — each run produces a fresh
   timestamped pair so you can diff two runs (e.g. before/after a migration phase) by comparing
   files directly.

## If the script fails

- `psql: could not connect` — the Postgres container isn't up. Check `docker ps` for
  `foundation-db`, or start it per the repo's dev-environment docs.
- `error: warehouse db not found` — confirm the path; the real file lives at
  `~/.hominem/warehouse.db` (not the `.tmp/test/warehouse.db` fixture inside the warehouse repo,
  which is test-only data).
- Empty `app` schema output — this is a valid result, not a bug. It has happened before (see the
  correction note in `warehouse/specs/002-full-schema-migration/schema-comparison-and-order.md`)
  and means those tables genuinely don't exist yet, not that the query is broken.
