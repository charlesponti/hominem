# Schema diff workflow

Use this workflow whenever comparing the warehouse SQLite database (`~/.hominem/warehouse.db`, from the personal data warehouse) against Hominem's live Postgres schema. Typical uses are planning a warehouse-to-Hominem migration or verifying that a migration phase landed correctly.

Always introspect live database state. Never infer schema from migration files. A table can be created in one Goose migration and dropped in a later migration; only the database reflects what is currently live.

## Steps

1. Ensure the intended Hominem Postgres environment is available (`just db status` checks connectivity) and confirm the warehouse SQLite file exists. Do not start a container or service automatically.
2. Run `scripts/pull-schemas.sh` from the `hominem-database` skill directory. It writes timestamped snapshots to the skill's `snapshots/` directory by default: one for every SQLite table and one for tables in Hominem's `app`, `auth`, `public`, and `ops` schemas.
3. Override defaults when needed. Snapshot output redacts the Postgres URL:
   - `WAREHOUSE_DB` — warehouse SQLite path; default `$HOME/.hominem/warehouse.db`.
   - `HOMINEM_DATABASE_URL` — Postgres URL; default `postgresql://postgres:postgres@127.0.0.1:5434/hominem`.
   - `OUT_DIR` — snapshot destination; default `scripts/snapshots/` relative to the script.
4. Read both snapshots and compare in context. Group warehouse tables by domain, check live Hominem table existence and shape rather than name similarity, and use row counts to prioritize work.
5. Keep snapshots as gitignored scratch data. Do not commit them.

## Failure handling

- `psql: could not connect`: the Postgres container is unavailable; inspect `docker ps` and follow repository development-environment instructions.
- `error: warehouse db not found`: verify `WAREHOUSE_DB`; the real file is `~/.hominem/warehouse.db`, not a test fixture.
- Empty `app` schema output is valid and means those tables do not currently exist.
- The script records schema metadata and row counts only; review generated snapshots for sensitive data before sharing them.
