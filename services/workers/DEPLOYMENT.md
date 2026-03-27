# Workers Service Deployment Guide

## Overview

The workers service runs background jobs for Hominem using BullMQ (Redis-backed job queues). Production deployment targets Fly and uses the Docker image built from `services/workers/Dockerfile`.

## Architecture

The workers service processes asynchronous tasks:

- **Plaid Sync**: Syncs financial data from Plaid (3 concurrent jobs)
- **Smart Input**: AI-powered intelligent input processing (1 concurrent job)
- **Google Calendar**: Event synchronization with Google Calendar (2 concurrent jobs)
- **Place Photo**: Downloads and processes place photos (2 concurrent jobs)
- **Transaction Import**: Imports transactions from various sources (1 concurrent job)

All workers communicate through a shared Redis queue and use the same database.

## Docker Deployment

### Building the Image

The workers Docker image uses Alpine base with `bun build --compile` for a pre-compiled binary:

```bash
# Build the image
docker build -f services/workers/Dockerfile -t hominem-workers:latest .

# Build with specific platform (for multi-platform support)
docker buildx build --platform linux/amd64,linux/arm64 \
  -f services/workers/Dockerfile \
  -t hominem-workers:latest .
```

### Image Specifications

- **Base**: Alpine Linux with Bun runtime
- **Size**: ~127MB (pre-compiled binary only)
- **User**: Non-root user (hominem:1001)
- **Signal Handling**: Graceful shutdown with 5-second timeout
- **Health Check**: Process monitoring

### Running the Container

#### Local Development

```bash
docker run -d \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:pass@localhost:5432/hominem" \
  -e REDIS_URL="redis://localhost:6379" \
  -e OPENAI_API_KEY="your-key" \
  -e PLAID_CLIENT_ID="your-id" \
  -e PLAID_API_KEY="your-key" \
  --name hominem-workers \
  hominem-workers:latest
```

#### Docker Compose

```yaml
services:
  workers:
    build:
      context: .
      dockerfile: services/workers/Dockerfile
    image: hominem-workers:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/hominem
      REDIS_URL: redis://redis:6379
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      PLAID_CLIENT_ID: ${PLAID_CLIENT_ID}
      PLAID_API_KEY: ${PLAID_API_KEY}
      GOOGLE_OAUTH_CLIENT_ID: ${GOOGLE_OAUTH_CLIENT_ID}
      GOOGLE_OAUTH_CLIENT_SECRET: ${GOOGLE_OAUTH_CLIENT_SECRET}
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    healthcheck:
      test: ps aux | grep workers > /dev/null || exit 1
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Fly Deployment

### Configuration

Fly deployment is defined in:

- `infra/fly/apps/workers.toml`
- `services/workers/Dockerfile`

### Required Environment Variables

Set these as Fly secrets for `hominem-workers`:

```bash
fly secrets set \
  DATABASE_URL='postgresql://postgres:replace-me@hominem-postgres.flycast:5432/hominem?sslmode=disable' \
  REDIS_URL='redis://default:replace-me@your-upstash-host:6379' \
  GOOGLE_API_KEY='replace-me' \
  OPENROUTER_API_KEY='replace-me' \
  R2_ENDPOINT='replace-me' \
  R2_ACCESS_KEY_ID='replace-me' \
  R2_SECRET_ACCESS_KEY='replace-me' \
  R2_BUCKET_NAME='replace-me' \
  OTEL_EXPORTER_OTLP_ENDPOINT='https://hominem-otel.fly.dev' \
  --app hominem-workers
```

Add Plaid secrets if finance workers run in production.

### Deploy via Fly CLI

Run from the repo root:

```bash
flyctl deploy --config infra/fly/apps/workers.toml --app hominem-workers
```

## GitHub Actions Workflow

The deployment workflow ([`.github/workflows/deploy-workers.yml`](/.github/workflows/deploy-workers.yml)) automatically:

1. **Triggered on**: Code quality checks pass on main branch or manual dispatch
2. **Checks out code** from the repository
3. **Deploys to Fly** using `infra/fly/apps/workers.toml`

### Workflow Steps

1. Cancel previous runs
2. Checkout code
3. Set up `flyctl`
4. Deploy to Fly

### Manual Trigger

```bash
# Trigger workflow via GitHub CLI
gh workflow run deploy-workers.yml
```

## Local Development

### Prerequisites

- Docker
- Docker Compose
- Bun (for local testing)
- Redis running (`docker run -d -p 6379:6379 redis:latest`)
- PostgreSQL running

### Development Workflow

```bash
# Start dependencies
docker-compose up -d postgres redis

# Install dependencies
bun install

# Run workers locally (interpreted mode, faster for development)
bun run services/workers/src/index.ts

# Run with file watching
bun --watch services/workers/src/index.ts

# Run tests
bun run test

# Build Docker image locally for testing
docker build -f services/workers/Dockerfile -t hominem-workers:dev .

# Run Docker image locally
docker run -it \
  -e NODE_ENV=development \
  -e DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hominem" \
  -e REDIS_URL="redis://localhost:6379" \
  hominem-workers:dev

# For production deployment
flyctl deploy --config infra/fly/apps/workers.toml --app hominem-workers
```

## Scaling

### Single Container (Current)

All workers run in one container. Scale the service as a whole:

```bash
# Kubernetes: 3 replicas
kubectl scale deployment hominem-workers --replicas=3

# Docker Swarm
docker service scale hominem-workers=3
```

### Multiple Containers (Recommended for Production)

Create separate entry points for each worker type to scale independently:

```yaml
# docker-compose.yml
services:
  worker-plaid:
    build:
      context: .
      dockerfile: services/workers/Dockerfile
    environment:
      WORKER_TYPE: plaid
    deploy:
      replicas: 3

  worker-smart-input:
    build:
      context: .
      dockerfile: services/workers/Dockerfile
    environment:
      WORKER_TYPE: smart-input
    deploy:
      replicas: 2

  worker-google-calendar:
    build:
      context: .
      dockerfile: services/workers/Dockerfile
    environment:
      WORKER_TYPE: google-calendar
    deploy:
      replicas: 2
```

This requires:

- Separate entry points in `src/index.ts`
- Environment variable to select worker type
- Individual monitoring per worker

## Monitoring

### Docker Logs

```bash
# View logs
docker logs hominem-workers -f

# View recent logs
docker logs hominem-workers --tail 100

# With timestamps
docker logs hominem-workers -f --timestamps
```

### Metrics to Monitor

- **Queue Depth**: Number of jobs waiting
- **Processing Time**: Average job duration
- **Failed Jobs**: Error count and rate
- **Throughput**: Jobs processed per minute
- **Worker Health**: Memory, CPU usage
- **Redis Connection**: Connection pool status

### Health Check

```bash
# Check if container is healthy
docker inspect hominem-workers --format='{{json .State.Health}}'

# Output example
{
  "Status": "healthy",
  "FailingStreak": 0,
  "Log": [...]
}
```

## Troubleshooting

### Jobs Not Processing

**Symptoms**: Queue depth increasing, jobs not completing

**Steps**:

1. Check Redis connectivity: `redis-cli ping`
2. Verify queue names match between API and workers
3. Check worker error logs: `docker logs hominem-workers`
4. Ensure concurrency > 0 in worker configuration
5. Check if workers are running: `docker ps | grep workers`

### Memory Leaks

**Symptoms**: Memory usage increasing over time, eventually OOM

**Steps**:

1. Monitor memory: `docker stats hominem-workers`
2. Check for circular references in job processors
3. Enable memory profiling: `node --inspect`
4. Generate heap snapshots for analysis
5. Review recent code changes for memory issues

### Slow Job Processing

**Symptoms**: Jobs taking much longer than expected

**Steps**:

1. Check external service latency (Plaid, Google, OpenAI)
2. Review database query performance
3. Check Redis latency: `redis-cli --latency`
4. Increase concurrency if I/O-bound
5. Add job batching if processing many items

### Worker Crashes

**Symptoms**: Container restarts frequently

**Steps**:

1. Check restart count: `docker inspect hominem-workers`
2. Review error logs immediately after restart
3. Check resource limits: memory and CPU
4. Verify environment variables are set
5. Test with `bun run start` locally to reproduce

### High CPU Usage

**Symptoms**: CPU constantly at 100%

**Steps**:

1. Check active job count
2. Reduce concurrency if CPU-bound
3. Profile with: `node --prof`
4. Check for infinite loops in job processors
5. Review recent job processor changes

## Performance Optimization

### Startup Time

- **With bun compile**: ~1-2 seconds
- **Without (interpreted)**: ~4-5 seconds

### Memory Usage

- **Per container**: 100-500MB depending on concurrency
- **Per job**: Typically <10MB

### Throughput

- **Plaid Sync**: ~5-10 jobs/minute per concurrent job
- **Smart Input**: ~20-30 jobs/minute
- **Google Calendar**: ~10-20 jobs/minute
- **Transaction Import**: ~5-10 files/minute

### Tuning

```typescript
// Adjust concurrency per worker
const plaidWorker = new Worker(QUEUE_NAMES.PLAID_SYNC, processor, {
  concurrency: 3, // Increase for I/O-bound, decrease for CPU-bound
  lockDuration: 1000 * 60 * 10, // How long job can run
  stalledInterval: 1000 * 60 * 5, // Check for stalled jobs
});

// Set job timeouts
queue.add('job-name', data, {
  timeout: 1000 * 60 * 5, // 5 minutes
});

// Implement retry strategy
queue.add('job-name', data, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
});
```

## Security

### Secrets Management

Never hardcode secrets. Use environment variables:

```bash
# Good
-e OPENAI_API_KEY="${OPENAI_API_KEY}"

# Bad
-e OPENAI_API_KEY="sk-1234567890abcdef"
```

### Container Security

- ✅ Non-root user (hominem:1001)
- ✅ No shell access (/sbin/nologin)
- ✅ Read-only filesystem (where possible)
- ✅ Minimum required capabilities
- ✅ No privileged mode

### Network Security

- Restrict Redis access to workers only
- Use VPC/network policies for isolation
- Enable encryption for sensitive data in flight
- Monitor for unusual network activity

## Disaster Recovery

### Backup Strategy

- Queue jobs are stored in Redis only
- On restart: jobs are re-queued automatically
- Failed jobs kept for 50 runs (configurable)
- Completed jobs kept for 100 runs (configurable)

### Recovery Procedures

```bash
# Redeploy workers
flyctl deploy --config infra/fly/apps/workers.toml --app hominem-workers

# Check worker status
flyctl status --app hominem-workers

# Stream worker logs
flyctl logs --app hominem-workers

# Check queue status
redis-cli KEYS "bull:*"

# Clear specific queue (careful!)
redis-cli DEL "bull:plaid-sync"
```

## Maintenance

### Regular Tasks

- Monitor error rates weekly
- Review slow job logs monthly
- Update dependencies quarterly
- Run security scans monthly
- Review and adjust concurrency settings

### Upgrades

The deploy workflow rebuilds and redeploys on changes:

```bash
# Commit and push changes to main
git add services/workers/Dockerfile
git commit -m "Update worker configuration"
git push origin main

# GitHub Actions automatically:
# 1. Detects the change
# 2. Runs code-quality
# 3. Triggers deploy-workers
# 4. Deploys to Fly

# Or deploy manually
flyctl deploy --config infra/fly/apps/workers.toml --app hominem-workers
```

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Fly Deployment Guide](/infra/fly/apps/README.md)
- [Architecture Guide](./ARCHITECTURE.md)
