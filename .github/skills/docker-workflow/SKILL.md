---
name: docker-workflow
description: Use for Dockerfiles, compose files, local infra, and Docker-backed production packaging.
---

# Docker Workflow

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

Local infrastructure uses Compose for:

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
make docker-up-full
```

The API production image is built from `services/api/Dockerfile`.

## Rules

- Build from the repo root.
- Keep runtime images minimal and production-only.
- Run containers as non-root users.
- Keep health checks cheap and HTTP-based.
- Never bake secrets into images.
- Keep Compose focused on infrastructure and observability.
- Treat the test database as ephemeral.
- Keep `.dockerignore` aligned with the actual build context.
- Treat `down -v` as destructive.

## Verification

```bash
make dev-status
make auth-test-status
docker build -f services/api/Dockerfile -t hominem-api:test .
docker run --rm hominem-api:test ./api --help
curl -fsS http://localhost:3000/api/status
```
