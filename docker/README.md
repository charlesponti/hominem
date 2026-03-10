# Docker Development Environment

## Quick Start

### Development (with persistence)
```bash
cd docker
docker-compose -f compose/base.yml -f compose/dev.yml up -d
```

### Development + Monitoring
```bash
cd docker
docker-compose -f compose/base.yml -f compose/dev.yml -f compose/monitoring.yml up -d
```

### Test (ephemeral)
```bash
cd docker
docker-compose -f compose/test.yml up -d
docker-compose -f compose/test.yml down -v  # Clean up
```

### Production
```bash
POSTGRES_PASSWORD=your-secure-password docker-compose -f compose/base.yml -f compose/prod.yml up -d
```

## Full Documentation

- **[Canonical Docker Skill](../.github/skills/docker-workflow/SKILL.md)** - Current Docker source of truth
- **[Canonical Setup Skill](../.github/skills/setup-workflow/SKILL.md)** - Repo-level local setup and daily workflow
- **[Canonical Deployment Skill](../.github/skills/deployment-workflow/SKILL.md)** - Repo-level production and release guidance

## Services

| Service | Port | Purpose |
|---------|------|---------|
| db | 5434 | Main PostgreSQL database |
| test-db | 4433 | Ephemeral test database |
| grafana-db | 5433 | Grafana's database |
| redis | 6379 | Cache/sessions |
| prometheus | 9090 | Metrics |
| alertmanager | 9093 | Alerts |
| node-exporter | 9100 | System metrics |
| grafana | 3000 | Dashboards |

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
docker-compose down -v  # WARNING: destroys data
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
docker-compose logs db
```

### "Old PostgreSQL data" error
PG18 requires mounting to `/var/lib/postgresql`, not `/var/lib/postgresql/data`. Remove old volumes:
```bash
docker-compose down -v
```

### Extensions not available
Create them manually or ensure migrations run on startup.
