# Workers Architecture & Best Practices

## Overview

The Hominem workers service manages background jobs and asynchronous tasks using BullMQ, a robust Redis-backed job queue. Currently, workers are deployed via Railway's RAILPACK builder, but this document outlines best practices and the recommended migration to Docker containerization for consistency and scalability.

## Current Architecture

### Components

```
┌─────────────────────────────────────────┐
│         API Service                     │
│  (produces jobs via Redis queue)        │
└──────────────────┬──────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   Redis Queue         │
        │  (BullMQ)             │
        └──────────────────────┘
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
   ┌──────┐  ┌──────┐  ┌──────────┐
   │Plaid │  │Smart │  │Google Cal│
   │Worker│  │Input │  │ Worker   │
   │      │  │Worker│  │          │
   └──────┘  └──────┘  └──────────┘
```

### Current Workers

1. **Plaid Sync Worker** (`plaid-worker.ts`)
   - Syncs financial data from Plaid
   - Concurrency: 3 jobs
   - Lock duration: 10 minutes

2. **Smart Input Worker** (`smart-input/smart-input.worker.ts`)
   - AI-powered intelligent input processing
   - Uses OpenAI for smart categorization

3. **Google Calendar Sync Worker** (`google-calendar-sync-worker.ts`)
   - Synchronizes events with Google Calendar
   - Handles OAuth tokens and calendar events

4. **Place Photo Worker** (`place-photo-worker.ts`)
   - Downloads and processes place photos
   - Manages media storage

5. **Transaction Import Worker** (`transaction-import-worker.ts`)
   - Imports transactions from various sources
   - Parses CSV, PDF, and email data

### Job Queue Configuration

- **Queue System**: BullMQ (Redis-backed)
- **Redis Connection**: Shared with API service
- **Removal Policy**:
  - Keep last 100 completed jobs
  - Keep last 50 failed jobs
- **Stalled Job Detection**: 5-minute interval
- **Graceful Shutdown**: 5-second timeout

## Current Issues & Why Docker Matters

### Issue 1: No Docker Containerization

**Current**: Deployed via Railway's RAILPACK builder

```json
{
  "build": {
    "builder": "RAILPACK",
    "buildCommand": "bun turbo run build --filter=@hominem/workers --force"
  }
}
```

**Problem**:

- No version control of container image
- Vendor lock-in to Railway's build system
- Can't test locally in production environment
- Inconsistent with API service (which uses Docker)
- No ability to run multiple workers locally
- Harder to reproduce production issues

**Best Practice**: Use Docker with bun compile for consistency with API service

### Issue 2: All Workers in Single Process

**Current**: All workers run in one process (`index.ts` imports all)

```typescript
import './plaid-worker';
import './smart-input/smart-input.worker.ts';
import './google-calendar-sync-worker';
import './place-photo-worker';
import './transaction-import-worker';
```

**Problem**:

- Can't scale individual workers independently
- One slow worker blocks others
- Memory usage not isolated per worker
- Hard to debug specific worker issues
- Restart affects all workers

**Best Practice**: Separate workers into individual Docker containers

### Issue 3: Inconsistent Deployment Strategy

**Current**:

- API: Docker + bun compile (optimized)
- Workers: Railway's RAILPACK (not optimized)

**Problem**:

- Different deployment paths
- Different optimization levels
- Different monitoring strategies
- Harder to manage infrastructure

**Best Practice**: Same deployment strategy for all services

## Recommended Architecture

### Option 1: Multi-Worker Process (Current, with Docker)

Best for: Small scale, shared resources

```
Docker Image (workers service)
  ├── Plaid Worker (concurrency: 3)
  ├── Smart Input Worker (concurrency: 1)
  ├── Google Calendar Worker (concurrency: 2)
  ├── Place Photo Worker (concurrency: 2)
  └── Transaction Import Worker (concurrency: 1)
```

**Pros**:

- Single container to manage
- Shared memory and connections
- Lower overhead
- Simple deployment

**Cons**:

- Can't scale individual workers
- All workers restart together

### Option 2: Separate Worker Containers (Recommended)

Best for: Scaling, isolation, reliability

```
Docker Images (separate services)
  ├── Worker: Plaid (3 replicas)
  ├── Worker: Smart Input (2 replicas)
  ├── Worker: Google Calendar (2 replicas)
  ├── Worker: Place Photo (2 replicas)
  └── Worker: Transaction Import (1 replica)
```

**Pros**:

- Scale individual workers independently
- Isolated memory/CPU per worker
- Granular monitoring and logging
- Better failure isolation
- Easier debugging

**Cons**:

- More containers to manage
- Higher overhead (Kubernetes/orchestration)
- More complex deployment

## Migration Plan

### Step 1: Containerize Workers (✅ Done)

- Create `Dockerfile` for workers (Alpine base, bun compile)
- Create `.dockerignore` (exclude dev files)
- Test locally with Docker

### Step 2: Update Deployment

- Replace Railway RAILPACK with Docker deployment
- Use same optimizations as API service
- Push to container registry

### Step 3: (Optional) Separate Worker Containers

For each worker type:

- Create separate entry point
- Create separate Dockerfile (or use base image)
- Deploy with individual scale settings
- Set up monitoring per worker

## Docker Deployment

### Single Container (Current Approach)

**Build**:

```bash
docker build -f services/workers/Dockerfile -t hominem-workers:latest .
```

**Run**:

```bash
docker run -d \
  -e REDIS_URL="redis://redis:6379" \
  -e DATABASE_URL="postgresql://..." \
  -e OPENAI_API_KEY="..." \
  --name hominem-workers \
  hominem-workers:latest
```

**Docker Compose**:

```yaml
services:
  workers:
    image: hominem-workers:latest
    environment:
      NODE_ENV: production
      REDIS_URL: redis://redis:6379
      DATABASE_URL: postgresql://...
    depends_on:
      - redis
      - postgres
    restart: unless-stopped
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '1'
```

### Multi-Container Deployment

**Separate Dockerfiles** (one per worker):

```dockerfile
# services/workers/Dockerfile.plaid
COPY --from=builder /app/workers ./workers
ENTRYPOINT ["./workers", "--worker=plaid"]
```

```dockerfile
# services/workers/Dockerfile.smart-input
COPY --from=builder /app/workers ./workers
ENTRYPOINT ["./workers", "--worker=smart-input"]
```

**Kubernetes Deployment**:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hominem-plaid-worker
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: worker
          image: hominem-workers:plaid
          resources:
            requests:
              memory: '256Mi'
              cpu: '100m'
            limits:
              memory: '512Mi'
              cpu: '500m'
```

## Configuration Management

### Environment Variables

Required:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://...
REDIS_URL=redis://redis:6379
OPENAI_API_KEY=...
```

Optional (with defaults):

```bash
PLAID_CLIENT_ID=...
PLAID_API_KEY=...
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
```

### Graceful Shutdown

The workers service handles graceful shutdown:

```typescript
function gracefulShutdown(exitCode = 0) {
  // 1. Stop accepting new jobs
  // 2. Allow in-flight jobs to complete (up to 5 seconds)
  // 3. Close Redis connections
  // 4. Exit process
}

process.on('SIGTERM', () => gracefulShutdown(0));
process.on('SIGINT', () => gracefulShutdown(0));
```

**Kubernetes termination**:

```yaml
lifecycle:
  preStop:
    exec:
      command: ['/bin/sh', '-c', 'sleep 5']
terminationGracePeriodSeconds: 10
```

## Monitoring & Logging

### Health Checks

**Docker**:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=3s --retries=3 \
    CMD ps aux | grep workers > /dev/null || exit 1
```

**Kubernetes**:

```yaml
livenessProbe:
  exec:
    command:
      - sh
      - -c
      - ps aux | grep workers > /dev/null
  initialDelaySeconds: 10
  periodSeconds: 30
```

### Logging

Workers output to stdout/stderr (Docker logs):

```bash
# View logs
docker logs hominem-workers -f

# With JSON formatting
docker logs hominem-workers --follow | jq .
```

### Metrics to Monitor

- **Queue depth**: Jobs waiting in queue
- **Processing time**: Average job duration
- **Failed jobs**: Error rates by worker
- **Worker health**: Active workers, memory usage
- **Throughput**: Jobs processed per minute

## Resource Requirements

### Per Worker Container

**Minimum**:

- CPU: 100m (0.1 cores)
- Memory: 256Mi

**Recommended**:

- CPU: 250-500m (0.25-0.5 cores)
- Memory: 512Mi-1Gi

**High Load**:

- CPU: 1000m (1 core)
- Memory: 1-2Gi

### Shared Resources

- Redis: 512Mi minimum, 1-2Gi recommended
- PostgreSQL: 1-2Gi minimum, 4-8Gi recommended

## Performance Optimization

### Startup

With bun compile:

- Startup time: ~1-2 seconds
- Image size: ~127MB
- Memory: ~100MB at startup

Without bun compile:

- Startup time: ~4-5 seconds
- Image size: ~379MB (with node_modules)
- Memory: ~150MB at startup

### Job Processing

**Concurrency Settings** (tunable per worker):

```typescript
const plaidWorker = new Worker(queueName, processor, {
  concurrency: 3, // Process 3 jobs in parallel
  lockDuration: 10 * 60 * 1000, // 10-minute lock
  stalledInterval: 5 * 60 * 1000, // Check every 5 minutes
});
```

**Optimization Tips**:

- Increase concurrency for I/O-bound jobs
- Decrease concurrency for CPU-bound jobs
- Use job timeouts to prevent hangs
- Implement exponential backoff for retries

## Best Practices

### 1. Use Docker for Consistency

✅ DO: Deploy both API and workers via Docker
❌ DON'T: Mix deployment strategies (Railway + Docker)

### 2. Separate Workers When Scaling

✅ DO: Create separate containers for independent scaling
❌ DON'T: Force all workers to scale together

### 3. Graceful Shutdown

✅ DO: Handle SIGTERM and allow job completion
❌ DON'T: Kill workers immediately

### 4. Monitoring

✅ DO: Track queue depth, processing time, error rates
❌ DON'T: Assume workers are healthy without metrics

### 5. Dead Letter Queues

✅ DO: Keep failed jobs for analysis
❌ DON'T: Lose error information

### 6. Resource Limits

✅ DO: Set CPU and memory limits per container
❌ DON'T: Allow unlimited resource consumption

### 7. Health Checks

✅ DO: Implement regular health checks
❌ DON'T: Assume the process is running correctly

### 8. Logging

✅ DO: Log job start, completion, and failures
❌ DON'T: Log sensitive data (API keys, tokens)

## Security Considerations

- **Non-root user**: Workers run as `hominem:1001`
- **No shell access**: User has `/sbin/nologin`
- **Minimal image**: No package managers or dev tools
- **Network isolation**: Can be run in separate network
- **Secrets management**: Use environment variables or secret managers
- **Read-only filesystem**: Can be enabled in orchestration

## Future Enhancements

### 1. Priority Queues

Implement job prioritization:

```typescript
const priorityQueue = new Queue(name, {
  settings: {
    lockDuration: 30000,
    maxStalledCount: 2,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      priority: 'high',
    },
  },
});
```

### 2. Rate Limiting

Prevent queue overload:

```typescript
queue.setGlobalConcurrency(maxJobsPerWindow, windowSize);
```

### 3. Custom Metrics

Integration with Prometheus/datadog:

```typescript
worker.on('completed', (job) => {
  metrics.histogram('job_duration', job.finishedOn - job.startedOn);
});
```

### 4. Circuit Breakers

Prevent cascading failures:

```typescript
if (failureRate > threshold) {
  circuitBreaker.trip();
  // Stop accepting jobs
}
```

### 5. Worker-Specific Configurations

Separate configuration per worker:

```typescript
const workerConfigs = {
  plaid: { concurrency: 3, timeout: 600000 },
  smartInput: { concurrency: 1, timeout: 120000 },
  googleCalendar: { concurrency: 2, timeout: 300000 },
};
```

## Troubleshooting

### Jobs Not Processing

1. Check Redis connectivity
2. Verify queue name matches
3. Check worker error logs
4. Ensure concurrency > 0

### Memory Leaks

1. Monitor memory over time
2. Check for circular references
3. Implement memory profiling
4. Use Node.js heap snapshots

### Slow Job Processing

1. Increase concurrency (if I/O-bound)
2. Check external service latency (Plaid, Google, OpenAI)
3. Optimize database queries
4. Add job batching

### Worker Crashes

1. Check error logs
2. Review graceful shutdown handling
3. Implement circuit breakers
4. Add retry logic

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Kubernetes Workers Pattern](https://kubernetes.io/docs/concepts/workloads/)
- [Redis Queue Patterns](https://redis.io/topics/streams-intro)
