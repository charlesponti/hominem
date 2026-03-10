---
applyTo: 'docker/**, services/**/Dockerfile, **/railway.json'
---

# Docker

## Scope

Use this as the canonical Docker reference for the repo.

## Repo Layout

- `services/api/Dockerfile`
- `.dockerignore`
- `docker/compose/base.yml`
- `docker/compose/dev.yml`
- `docker/compose/monitoring.yml`
- `docker/compose/prod.yml`
- `docker/postgres/Dockerfile`
- `docker/README.md`
- `Makefile`

## Current Model

### Local Infrastructure

The repo uses Docker Compose for local infrastructure, not the full application stack by default.

Primary services:

- `redis`
- `db`
- `test-db`
- `grafana-db`
- optional monitoring services

Preferred commands:

```bash
make dev-up
make dev-down
make dev-reset
make dev-status
```

### Monitoring

```bash
make docker-up-full
```

### API Production Image

Built from `services/api/Dockerfile`.

Current expectations:

- multi-stage build
- Bun Alpine base image
- non-root runtime user
- minimal runtime packages
- HTTP health check against `/api/status`

Build example:

```bash
docker build -f services/api/Dockerfile -t hominem-api:test .
```

## Rules

### Build And Runtime

- Build from the repo root.
- Keep runtime images minimal and production-only.
- Run containers as non-root users.
- Prefer immutable, reproducible builds.
- Keep health checks cheap and HTTP-based.

### Secrets

- Never bake secrets into image layers.
- Pass secrets at runtime.
- Do not commit `.env` files or secret material.

### Local Infra

- Use `Makefile` targets as the default interface.
- Keep Compose focused on infrastructure dependencies and observability.
- Treat the test database as ephemeral.

### Security

- Use least privilege.
- Keep only required runtime packages.
- Remove unnecessary build artifacts.
- Keep `.dockerignore` aligned with the actual build context.

### Data Safety

- Treat `down -v` as destructive.
- Document destructive commands clearly.

## Local Ports

- Postgres: `5434`
- Test Postgres: `4433`
- Grafana Postgres: `5433`
- Redis: `6379`
- Prometheus: `9090`
- Alertmanager: `9093`
- Node Exporter: `9100`
- Grafana: `3000`

## Verification

Local infra:

```bash
make dev-status
make auth-test-status
```

Image build:

```bash
docker build -f services/api/Dockerfile -t hominem-api:test .
docker run --rm hominem-api:test ./api --help
```

API health:

```bash
curl -fsS http://localhost:3000/api/status
```

## Troubleshooting

- inspect service status with `make dev-status`
- inspect logs with `docker compose ... logs <service>`
- verify ports are not already in use
- if local state reset is intentional, use `make dev-reset`

When Docker behavior changes:

1. Update the Dockerfiles or compose files first.
2. Update this instruction file to match.
3. Remove stale guidance instead of adding parallel Docker docs.
