---
applyTo: '**'
---

# Setup

## Scope

Use this as the canonical repo-level setup guide.

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

Run from the monorepo root:

```bash
bun install
bun run dev:doctor
make dev-up
make db-migrate-all
```

## Canonical Local Workflow

Start local infrastructure:

```bash
make dev-up
make dev-status
```

Run the workspace:

```bash
bun run dev
```

Target a surface explicitly when helpful:

```bash
bun run dev --filter @hominem/mobile
bun run dev --filter @hominem/finance
bun run dev --filter @hominem/notes
```

Stop or reset local infra:

```bash
make dev-down
make dev-reset
```

`make dev-reset` is destructive.

## Local Ports

- API examples target `http://localhost:4040`
- Postgres: `5434`
- Test Postgres: `4433`
- Redis: `6379`
- Grafana Postgres: `5433`

## Database Workflow

The repo uses SQL-first Goose migrations.

```bash
make db-migrate
make db-migrate-test
make db-migrate-all
```

Validation:

```bash
bun run validate-db-imports
bun run check
```

Keep schema changes in `packages/db/migrations`.

## Advanced Local HTTPS

Default development does not require a local reverse proxy.

When a browser workflow requires local HTTPS domains, the checked-in `Caddyfile` currently supports:

- `notes.hominem.test`
- `finance.hominem.test`
- `rocco.hominem.test`

Treat that as an advanced path rather than the default boot flow.

## Verification

```bash
make dev-status
bun run typecheck
bun run test
bun run check
```

Auth smoke:

```bash
bun run test:e2e:auth:live:local
bun run test:e2e:auth
```
