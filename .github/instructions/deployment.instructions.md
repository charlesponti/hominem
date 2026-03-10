---
applyTo: '**'
---

# Deployment

## Scope

Use this as the canonical repo-level deployment guide.

## Current Deployment Model

### Railway Manifests

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

Run from the repo root unless a service README says otherwise.

### Validate

```bash
bun run check
```

If auth or mobile behavior changed:

```bash
bun run test:e2e:auth
bun run test:e2e:auth:live
```

### Check Environment Drift

```bash
bun scripts/sync-env.ts check
bun scripts/sync-env.ts diagnose api
```

### Railway Operations

```bash
railway status
railway logs --service <service-name>
railway up --detach
```

## Mobile iOS Release

Credential bootstrap:

```bash
bunx --cwd apps/mobile eas credentials --platform ios
```

Preview build:

```bash
bun run --filter @hominem/mobile build:preview
```

Production build:

```bash
bun run --filter @hominem/mobile build:production
```

Submit latest build:

```bash
bunx --cwd apps/mobile eas submit --platform ios --latest
```

For deeper runtime and variant detail, use `apps/mobile/README.md`.

## Post-Deploy Verification

- confirm Railway health checks pass
- inspect logs for startup failures
- verify the API health endpoint
- run smoke tests for auth-sensitive changes

Useful commands:

```bash
railway logs --service <service-name>
curl -fsS https://<service-domain>/api/status
bun run test:e2e:auth:live
```
