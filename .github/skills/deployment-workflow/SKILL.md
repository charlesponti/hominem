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
```

Check or manage environment variables:

```bash
railway variables --service api          # list vars
railway variables set KEY=value          # set a var
railway variables delete KEY             # delete a var
railway run -- bun dev                   # inject prod vars locally
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
