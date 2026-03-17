---
name: setup-workflow
description: Use for repo bootstrap, local infrastructure setup, and standard day-to-day dev commands.
---

# Setup Workflow

## Prerequisites

- Bun `1.3.0`
- Node.js `22.x`
- Docker with Compose support
- Xcode, EAS CLI, and simulator tooling only for mobile work

Version sources:

- `.tool-versions`
- `.node-version`
- `package.json`

## First-Time Setup

```bash
bun install
bun run dev:doctor
make dev-up
make db-migrate-all
```

## Canonical Local Workflow

```bash
make dev-up
make dev-status
bun run dev
make dev-down
make dev-reset
```

Target a surface when helpful:

```bash
bun run dev --filter @hominem/mobile
bun run dev --filter @hominem/notes
```

## Local Ports

- API examples target `http://localhost:4040`
- Postgres: `5434`
- Test Postgres: `4433`
- Redis: `6379`
- Grafana Postgres: `5433`

## Database Workflow

```bash
make db-migrate
make db-migrate-test
make db-migrate-all
bun run validate-db-imports
bun run check
```

## Advanced Local HTTPS

Default development does not require a local reverse proxy.

The checked-in `Caddyfile` supports:

- `notes.hominem.test`

Use that only when a workflow truly needs browser-facing local HTTPS.
