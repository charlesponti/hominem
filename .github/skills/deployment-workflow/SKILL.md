---
name: deployment-workflow
description: Use for repo-level deployment work, Railway releases, environment drift checks, and mobile TestFlight releases.
---

# Deployment Workflow

## Railway Manifests

| Surface | Manifest | Builder | Notes |
| --- | --- | --- | --- |
| API | `services/api/railway.json` | `DOCKERFILE` | Health check: `/api/status` |
| Workers | `services/workers/railway.json` | `DOCKERFILE` | Dockerized worker runtime |
| Notes | `apps/notes/railway.json` | `RAILPACK` | Starts from `apps/notes` |
| Finance | `apps/finance/railway.json` | `RAILPACK` | Starts from `apps/finance` |
| Rocco | `apps/rocco/railway.json` | `RAILPACK` | Starts from `apps/rocco` |

## Rules

- Deploy from checked-in manifests.
- Keep secrets out of git and Docker images.
- Verify health checks and restart policy changes before rollout.
- Prefer managed services and runtime secret injection in production.

## Release Checklist

```bash
bun run check
```

For auth or mobile-sensitive changes:

```bash
bun run test:e2e:auth
bun run test:e2e:auth:live
```

Check environment drift:

```bash
bun scripts/sync-env.ts check
bun scripts/sync-env.ts diagnose api
```

Railway operations:

```bash
railway status
railway logs --service <service-name>
railway up --detach
```

## Mobile iOS Release

```bash
bunx --cwd apps/mobile eas credentials --platform ios
bun run --filter @hominem/mobile build:preview
bun run --filter @hominem/mobile build:production
bunx --cwd apps/mobile eas submit --platform ios --latest
```

For deeper mobile runtime and variant detail, use `apps/mobile/README.md`.
