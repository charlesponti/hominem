# @hominem/telemetry

OpenTelemetry instrumentation for Hominem services and apps.

## Usage

### For Node.js services (API, Workers)

```typescript
import { initTelemetry } from '@hominem/telemetry/node'

const telemetry = initTelemetry({
  serviceName: 'hominem-api',
  serviceVersion: '1.0.0',
  environment: 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT
})

// Shutdown gracefully
process.on('SIGTERM', async () => {
  await telemetry.shutdown()
})
```

### For Browser apps (Web)

```typescript
import { initTelemetry } from '@hominem/telemetry/browser'

initTelemetry({
  serviceName: 'hominem-web',
  serviceVersion: '1.0.0',
  environment: 'development',
  otlpEndpoint: 'http://localhost:4318'
})
```

### Manual instrumentation

```typescript
import { trace, metrics } from '@opentelemetry/api'

const tracer = trace.getTracer('my-component')
const meter = metrics.getMeter('my-component')

// Create a span
await tracer.startActiveSpan('process-payment', async (span) => {
  try {
    span.setAttribute('payment.id', paymentId)
    await processPayment(paymentId)
    span.setStatus({ code: SpanStatusCode.OK })
  } catch (error) {
    span.recordException(error)
    span.setStatus({ code: SpanStatusCode.ERROR })
    throw error
  } finally {
    span.end()
  }
})

// Create a counter
const requestCounter = meter.createCounter('requests.total')
requestCounter.add(1, { route: '/api/users' })
```

## Configuration

All configuration is done via environment variables:

- `OTEL_EXPORTER_OTLP_ENDPOINT` - OTLP endpoint (default: http://localhost:4318)
- `OTEL_EXPORTER_OTLP_PROTOCOL` - Protocol: http/protobuf or grpc (default: http/protobuf)
- `OTEL_SERVICE_NAME` - Service name (required)
- `OTEL_SERVICE_VERSION` - Service version (optional)
- `OTEL_RESOURCE_ATTRIBUTES` - Additional resource attributes (comma-separated key=value pairs)
- `OTEL_TRACES_SAMPLER` - Sampler: always_on, always_off, traceidratio (default: always_on)
- `OTEL_TRACES_SAMPLER_ARG` - Sampler ratio if using traceidratio (default: 1.0)
- `OTEL_LOG_LEVEL` - Log level for OTel SDK (default: info)

## Exports

- `@hominem/telemetry` - Shared utilities and types
- `@hominem/telemetry/node` - Node.js SDK initialization
- `@hominem/telemetry/browser` - Browser SDK initialization
- `@hominem/telemetry/shared` - Platform-agnostic utilities
