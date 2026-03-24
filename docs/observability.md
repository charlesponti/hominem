# Hominem Observability Stack

This project uses a centralized observability stack for local development that provides distributed tracing, metrics, and logging across all services.

## Quick Start

```bash
# 1. Start the observability stack (one time setup)
~/.local/observability/observability.sh start

# 2. Start your dev environment
bun run dev

# 3. Open Grafana
open http://localhost:3000
```

## Architecture

```
Your Apps (send telemetry)
    ↓
OpenTelemetry Collector (localhost:4318)
    ↓
├── Loki (logs)
├── Tempo (traces)
└── Mimir (metrics)
    ↓
Grafana (dashboards)
```

## Services

| Service | Port | Purpose | URL |
|---------|------|---------|-----|
| Grafana | 3000 | Dashboards | http://localhost:3000 |
| Loki | 3100 | Logs | http://localhost:3100 |
| Tempo | 3200 | Traces | http://localhost:3200 |
| Mimir | 8080 | Metrics | http://localhost:8080 |
| Prometheus | 9090 | Scraping | http://localhost:9090 |
| OTel Collector | 4318 | Ingestion | http://localhost:4318 |

## Configuration

Add these to your `.env` file:

```bash
# API Service / Workers
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=hominem-api  # or hominem-workers
OTEL_TRACES_SAMPLER_ARG=1.0

# Web App
VITE_OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
VITE_OTEL_SERVICE_NAME=hominem-web
```

## Dashboards

Pre-built dashboards are available in Grafana:

- **Hominem - Overview**: Unified view of all services
- **Hominem - API Service**: HTTP requests, latency, errors
- **Hominem - Workers**: Job processing metrics
- **Hominem - Web App**: Frontend performance

## Using Telemetry in Code

### Node.js Services

```typescript
import { initTelemetry } from '@hominem/telemetry/node';

const telemetry = initTelemetry({
  serviceName: 'my-service',
  environment: 'development'
});

// Shutdown gracefully
process.on('SIGTERM', () => telemetry.shutdown());
```

### Browser Apps

```typescript
import { initTelemetry } from '@hominem/telemetry/browser';

initTelemetry({
  serviceName: 'my-web-app',
  otlpEndpoint: 'http://localhost:4318'
});
```

### Manual Instrumentation

```typescript
import { trace, metrics } from '@opentelemetry/api';

const tracer = trace.getTracer('my-component');
const meter = metrics.getMeter('my-component');

// Create a span
await tracer.startActiveSpan('process-payment', async (span) => {
  span.setAttribute('payment.id', paymentId);
  await processPayment(paymentId);
  span.end();
});

// Create metrics
const counter = meter.createCounter('requests.total');
counter.add(1, { route: '/api/users' });
```

## Log Correlation

All logs automatically include trace and span IDs when OpenTelemetry is enabled:

```typescript
import { getSpanContextForLogs } from '@hominem/telemetry';

const logger = pino({
  mixin: () => getSpanContextForLogs()
});

// Logs will include: { trace_id: "...", span_id: "..." }
logger.info('Processing request', { userId: '123' });
```

## Mobile Apps

React Native has limited OpenTelemetry support. The mobile app uses **PostHog** for analytics instead:

```typescript
// Mobile observability is handled separately
import { initObservability } from '~/utils/observability';

initObservability(); // Uses PostHog, not OTel
```

## Disabling Telemetry

To disable telemetry for a specific service:

```bash
# In your .env file
OTEL_TRACES_EXPORTER=none
OTEL_METRICS_EXPORTER=none
```

## Troubleshooting

### Services won't start
```bash
~/.local/observability/observability.sh logs [service-name]
```

### No data in Grafana
1. Check OTel Collector: http://localhost:55679/debug/tracez
2. Verify endpoint is correct: `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`
3. Check Grafana data sources: http://localhost:3000/datasources

### Reset everything
```bash
~/.local/observability/observability.sh reset
```

## Resources

- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Grafana LGTM Stack](https://grafana.com/go/webinar/lgtm-stack/)
- [Internal Stack README](../../.local/observability/README.md)

## Comparison: PostHog vs Grafana

| Tool | Purpose | Question It Answers |
|------|---------|---------------------|
| **PostHog** | Product analytics | "What are users doing?" |
| **Grafana** | Infrastructure observability | "How is the system performing?" |

Both serve different purposes and are complementary.
