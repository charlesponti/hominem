# Docker Local Infrastructure

## Quick Start

### Development (with persistence)
```bash
docker compose -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml up -d
```

### Development + Observability
```bash
docker compose -f infra/docker/compose/base.yml -f infra/docker/compose/observability.yml up -d
```

### Full Stack
```bash
docker compose -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml -f infra/docker/compose/observability.yml up -d
```

### Test (ephemeral)
```bash
docker compose -f infra/docker/compose/test.yml up -d
docker compose -f infra/docker/compose/test.yml down -v
```

## Documentation

- **[Canonical Docker Skill](../../.github/skills/docker-workflow/SKILL.md)** - Current Docker source of truth
- **[Canonical Setup Skill](../../.github/skills/setup-workflow/SKILL.md)** - Repo-level local setup and daily workflow
- **[Container Observability Assets](./observability/README.md)** - Provider-light observability images and configs

## Services

| Service | Port | Purpose |
|---------|------|---------|
| db | 5434 | Main PostgreSQL database |
| test-db | 4433 | Ephemeral test database |
| redis | 6379 | Cache/sessions |
| clickhouse | 8123 | Telemetry storage |
| mongo | 27017 | HyperDX metadata store |
| hyperdx | 8080 | Observability UI |
| otel | 4318 | OTLP HTTP ingest |

## Stack Layers

- `base.yml` defines shared networks, volumes, and build anchors
- `dev.yml` brings up stateful local dependencies: Redis and PostgreSQL
- `observability.yml` adds ClickHouse, MongoDB, HyperDX, and the OTEL collector

## App Runtime

- `web`, `api`, `workers`, and `desktop` are not containerized in local development
- Run application processes with Turbo from the repo root
- Use Docker Compose here only for shared infrastructure and observability

## Notes

- Production deployment is intentionally undefined during the rebuild.
- Keep Docker assets here limited to reusable local infrastructure and image inputs.
- Use the root `Makefile` only for local infra orchestration while the new command surface settles.

## PostgreSQL 18

This setup uses PostgreSQL 18.3 with:
- pgvector 0.8.2
- PostGIS 3.6.2
- pgrouting 4.0.1

### Important: Volume Mount Change

PostgreSQL 18+ changed the volume mount location:

**Old (PG 17):**
```yaml
volumes:
  - db-data:/var/lib/postgresql/data
```

**New (PG 18):**
```yaml
volumes:
  - db-data:/var/lib/postgresql
```

If upgrading from PG 17, you'll need to remove old volumes:
```bash
docker compose -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml down -v
```

## Extensions

Extensions are created via migrations, not init scripts. To create them manually:

```bash
docker exec hominem-postgres psql -U postgres -c "
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgrouting;
-- etc.
"
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| POSTGRES_PASSWORD | postgres | Database password |
| POSTGRES_USER | postgres | Database user |
| POSTGRES_DB | hominem | Database name |

## Backup & Restore

### Backup
```bash
docker exec hominem-postgres pg_dump -U postgres hominem > backup.sql
```

### Restore
```bash
docker exec -i hominem-postgres psql -U postgres hominem < backup.sql
```

## Troubleshooting

### Container won't start
Check logs:
```bash
docker compose -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml logs db
```

### "Old PostgreSQL data" error
PG18 requires mounting to `/var/lib/postgresql`, not `/var/lib/postgresql/data`. Remove old volumes:
```bash
docker compose -f infra/docker/compose/base.yml -f infra/docker/compose/dev.yml down -v
```

### Extensions not available
Create them manually or ensure migrations run on startup.
