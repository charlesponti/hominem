# Railway Deployment Guide

This guide covers deploying Hominem to Railway from scratch.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Railway Project                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│   │  @hominem   │   │  @hominem   │   │  @hominem   │          │
│   │     api     │   │   notes     │   │  finance    │          │
│   │  (service)  │   │  (service)  │   │  (service)  │          │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘          │
│          │                 │                 │                  │
│          └────────────────┼─────────────────┘                  │
│                           │                                      │
│              ┌────────────┴────────────┐                        │
│              │                         │                        │
│         ┌────┴────┐              ┌─────┴─────┐                 │
│         │PostgreSQL│              │   Redis   │                 │
│         │ (plugin) │              │  (plugin) │                 │
│         └──────────┘              └───────────┘                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

- Railway account (sign up at railway.com)
- Railway CLI installed: `npm install -g @railway/cli`
- GitHub repository connected to Railway (optional, for auto-deploy)

## Step 1: Create Railway Project

### Option A: Via Dashboard

1. Go to [railway.com](https://railway.com) → New Project
2. Select "Empty Project" (we'll add services manually)
3. Name your project (e.g., "hominem")

### Option B: Via CLI

```bash
railway login
railway init hominem
cd hominem
```

## Step 2: Add Database Services

### PostgreSQL

```bash
# Add PostgreSQL plugin
railway add -c postgresql
```

Or via dashboard:
1. Project → + New → Plugin
2. Search "PostgreSQL" → Select "PostgreSQL"
3. Choose plan (Hobby is free)

### Redis

```bash
# Add Redis plugin
railway add -c redis
```

Or via dashboard:
1. Project → + New → Plugin
2. Search "Redis" → Select "Redis"
3. Choose plan

## Step 3: Configure Environment Variables

Set these in Railway dashboard (Project → Variables):

### Required Variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `DATABASE_URL` | (auto-generated) | From PostgreSQL plugin |
| `REDIS_URL` | (auto-generated) | From Redis plugin |
| `AUTH_SECRET` | (generate new) | Run: `openssl rand -base64 32` |

### Optional Variables

| Variable | Example | Notes |
|----------|---------|-------|
| `LOG_LEVEL` | `info` | Debug, info, warn, error |
| `SESSION_SECRET` | (generate new) | For session encryption |

### Setting Variables via CLI

```bash
# Set individual variable
railway variables set AUTH_SECRET=$(openssl rand -base64 32)

# Or set from .env file
railway variables set -e .env.production
```

## Step 4: Deploy Services

### Deploy All Services

Each app has its own `railway.json` defining how to build and deploy.

```bash
# From project root
railway up

# Or deploy specific service
cd services/api && railway up
cd ../apps/notes && railway up
```

### Understanding railway.json

Each service has a `railway.json`:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "services/api/Dockerfile"
  },
  "deploy": {
    "healthcheckPath": "/api/status",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

Key fields:
- `builder`: How to build (NIXPACKS, DOCKERFILE, etc.)
- `dockerfilePath`: Location of Dockerfile
- `healthcheckPath`: Endpoint Railway hits to check health
- `healthcheckTimeout`: Seconds to wait for health check

## Step 5: Verify Deployment

### Check Service Status

```bash
# View service logs
railway logs

# View specific service logs
railway logs --service api
```

### Health Checks

Railway uses health checks to verify your service is running. Ensure your app has a health endpoint:

```typescript
// Example: services/api/src/routes/status.ts
import { Hono } from 'hono';

const status = new Hono();

status.get('/api/status', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default status;
```

## Step 6: Database Setup

### Run Migrations

After deploying, run migrations on the production database:

```bash
# Get DATABASE_URL from Railway
railway variables get DATABASE_URL

# Run migrations (from local machine)
DATABASE_URL="postgres://..." bun run db:push
```

Or create a release command in Railway:

1. Railway Dashboard → Service → Settings
2. Add Release Command:
   ```
   bun run db:push
   ```

### Create Extensions

Run on production DB (via Railway's PostgreSQL console or local psql):

```bash
psql $DATABASE_URL -c "
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgrouting;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS intarray;
CREATE EXTENSION IF NOT EXISTS btree_gin;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
"
```

## Custom Domains (Optional)

1. Railway Dashboard → Service → Settings → Domains
2. Click "Generate Domain" or add custom domain
3. Update DNS records if using custom domain

## Monitoring

### Railway Dashboard

- **Deployments**: View deployment history
- **Logs**: Real-time logs via CLI or dashboard
- **Metrics**: CPU, Memory, Network usage

### Prometheus + Grafana

The project includes monitoring configs. Deploy separately:

```bash
# Deploy monitoring stack
# (Requires Railway Pro or custom Docker deployment)
```

## Troubleshooting

### "Service failed to start"

Check logs:
```bash
railway logs --service <service-name>
```

Common causes:
- Missing environment variables
- Health check endpoint not responding
- Port misconfiguration

### Database Connection Failed

1. Verify DATABASE_URL is set:
```bash
railway variables get DATABASE_URL
```

2. Check PostgreSQL plugin is active:
```bash
railway plugins
```

### Migration Errors

1. Check database extensions are installed
2. Verify DATABASE_URL is correct
3. Check migration logs for specific errors

### Slow Deployments

- Use smaller Docker images
- Optimize Dockerfile (multi-stage builds)
- Enable build caching in Railway settings

## Production Checklist

- [ ] PostgreSQL plugin added
- [ ] Redis plugin added
- [ ] Environment variables configured
- [ ] AUTH_SECRET generated and set
- [ ] Health check endpoints implemented
- [ ] Migrations run successfully
- [ ] Extensions created
- [ ] Domain configured (if custom)
- [ ] DNS pointing to Railway (if custom)

## Useful Commands

```bash
# Login
railway login

# Link to project
railway init

# Deploy
railway up

# View logs
railway logs

# Open Railway shell
railway shell

# Get variable
railway variables get DATABASE_URL

# Set variable
railway variables set KEY=value

# Remove variable
railway variables remove KEY

# View project status
railway status

# Connect to DB
railway postgresql connect
```

## Costs

| Service | Hobby (Free) | Pro |
|---------|--------------|-----|
| Compute | 500 hours/month | Unlimited |
| PostgreSQL | Free 128MB | From $5/month |
| Redis | Free 30MB | From $5/month |
| Bandwidth | 1GB/month | $0.10/GB |
| SSL | Free | Free |

Hobby tier is sufficient for development/testing.
