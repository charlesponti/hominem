/**
 * Node.js OpenTelemetry SDK initialization
 */

import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { AlwaysOnSampler, ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { context, propagation, trace, metrics, type Span } from '@opentelemetry/api'
import { registerLogSink, type LogEntry, type LogValue } from '@hominem/utils/logger'
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base'
import { AsyncHooksContextManager } from '@opentelemetry/context-async-hooks'
import { CompositePropagator, W3CTraceContextPropagator, W3CBaggagePropagator } from '@opentelemetry/core'
import { B3Propagator, B3InjectEncoding } from '@opentelemetry/propagator-b3'
import { JaegerPropagator } from '@opentelemetry/propagator-jaeger'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg'
import { RedisInstrumentation } from '@opentelemetry/instrumentation-redis'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import type { TelemetryConfig } from '../shared/index.js'
import { getTelemetryConfig, createResource } from '../shared/index.js'

/**
 * Node telemetry SDK instance
 */
export interface NodeTelemetry {
  /** Shutdown the SDK gracefully */
  shutdown(): Promise<void>
  /** Force flush all exporters */
  forceFlush(): Promise<void>
}

/**
 * Initialize OpenTelemetry for Node.js services
 */
export function initTelemetry(explicitConfig?: Partial<TelemetryConfig>): NodeTelemetry {
  const config = getTelemetryConfig(explicitConfig)
  const resource = createResource(config)

  // Set up context manager
  const contextManager = new AsyncHooksContextManager()
  contextManager.enable()
  context.setGlobalContextManager(contextManager)

  // Set up propagator (supports W3C, B3, and Jaeger formats)
  const propagator = new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new W3CBaggagePropagator(),
      new B3Propagator({ injectEncoding: B3InjectEncoding.MULTI_HEADER }),
      new JaegerPropagator(),
    ],
  })
  propagation.setGlobalPropagator(propagator)

  // Configure OTLP endpoint
  const otlpEndpoint = config.otlpEndpoint

  // Trace exporter and provider
  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
    compression: CompressionAlgorithm.GZIP,
  })

  const tracerProvider = new NodeTracerProvider({
    resource,
    sampler: createSampler(config.samplingRatio),
    spanProcessors: [new BatchSpanProcessor(traceExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 1000,
      exportTimeoutMillis: 30000,
    })],
  })

  tracerProvider.register()
  trace.setGlobalTracerProvider(tracerProvider)

  // Metrics provider
  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
    compression: CompressionAlgorithm.GZIP,
  })

  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 60000,  // Export every 60s
        exportTimeoutMillis: 30000,   // Timeout after 30s
      }),
    ],
  })
  metrics.setGlobalMeterProvider(meterProvider)

  // Logs provider (optional, only if explicitly enabled)
  let loggerProvider: LoggerProvider | undefined
  let unregisterLogSink: (() => void) | undefined
  if (process.env.OTEL_LOGS_EXPORTER !== 'none') {
    const logExporter = new OTLPLogExporter({
      url: `${otlpEndpoint}/v1/logs`,
      compression: CompressionAlgorithm.GZIP,
    })

    loggerProvider = new LoggerProvider({
      resource,
    })
    loggerProvider.addLogRecordProcessor(
      new BatchLogRecordProcessor(logExporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 1000,
        exportTimeoutMillis: 30000,
      })
    )

    const otelLogger = loggerProvider.getLogger(config.serviceName, config.serviceVersion)
    unregisterLogSink = registerLogSink((entry) => {
      otelLogger.emit({
        attributes: getLogAttributes(entry),
        body: entry.message,
        severityNumber: getSeverityNumber(entry.level),
        severityText: entry.level.toUpperCase(),
        timestamp: entry.timestamp,
      })
    })
  }

  // Auto-instrumentations
  registerInstrumentations({
    tracerProvider,
    meterProvider,
    instrumentations: [
      new HttpInstrumentation({
        requestHook: (span, request) => {
          if ('headers' in request) {
            const headers = getSafeHeaders(request.headers, REQUEST_HEADER_ALLOWLIST)
            if (headers !== undefined) {
              span.setAttribute('http.request.headers', headers)
            }
          }
        },
        responseHook: (span, response) => {
          if ('headers' in response) {
            const headers = getSafeHeaders(response.headers, RESPONSE_HEADER_ALLOWLIST)
            if (headers !== undefined) {
              span.setAttribute('http.response.headers', headers)
            }
          }
        },
        applyCustomAttributesOnSpan: (span, _request, response) => {
          if (response && response.statusCode != null && response.statusCode >= 400) {
            span.setStatus({ code: 2, message: `HTTP ${response.statusCode}` })
          }
        },
      }),
      new PgInstrumentation({
        enhancedDatabaseReporting: true,
      }),
      new RedisInstrumentation({
        dbStatementSerializer: (cmd, args) => {
          // Sanitize potentially sensitive data
          return `${cmd} ${args?.[0] || ''}`
        },
      }),
    ],
  })

  // Return control interface
  return {
    async shutdown(): Promise<void> {
      unregisterLogSink?.()
      await tracerProvider.shutdown()
      await meterProvider.shutdown()
      if (loggerProvider) {
        await loggerProvider.shutdown()
      }
    },
    async forceFlush(): Promise<void> {
      await tracerProvider.forceFlush()
      await meterProvider.forceFlush()
      if (loggerProvider) {
        await loggerProvider.forceFlush()
      }
    },
  }
}

const REQUEST_HEADER_ALLOWLIST = ['content-type', 'user-agent', 'x-request-id']
const RESPONSE_HEADER_ALLOWLIST = ['content-type', 'x-request-id']

function createSampler(samplingRatio?: number) {
  if (samplingRatio === undefined || samplingRatio >= 1) {
    return new AlwaysOnSampler()
  }

  if (samplingRatio <= 0) {
    return new TraceIdRatioBasedSampler(0)
  }

  return new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(samplingRatio),
  })
}

function getSeverityNumber(level: LogEntry['level']) {
  if (level === 'error') {
    return 17
  }

  if (level === 'warn') {
    return 13
  }

  if (level === 'info') {
    return 9
  }

  return 5
}

function getLogAttributes(entry: LogEntry) {
  if (entry.data === undefined) {
    return {}
  }

  if (entry.data instanceof Error) {
    return {
      'exception.message': entry.data.message,
      'exception.name': entry.data.name,
      ...(entry.data.stack ? { 'exception.stacktrace': entry.data.stack } : {}),
    }
  }

  const attributes: Record<string, LogValue> = {}
  for (const [key, value] of Object.entries(entry.data)) {
    const attributeValue = toLogValue(value)
    if (attributeValue !== undefined) {
      attributes[key] = attributeValue
    }
  }

  return attributes
}

function toLogValue(value: boolean | number | string | null | undefined | Error | object): LogValue | undefined {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (value instanceof Error) {
    return value.message
  }

  if (value === undefined || value === null) {
    return undefined
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function getSafeHeaders(
  headers: Record<string, string | string[] | undefined> | Headers,
  allowlist: string[],
) {
  const safeHeaders: Record<string, string> = {}

  for (const headerName of allowlist) {
    const headerValue = readHeaderValue(headers, headerName)
    if (headerValue !== undefined && headerValue !== '') {
      safeHeaders[headerName] = headerValue
    }
  }

  if (Object.keys(safeHeaders).length === 0) {
    return undefined
  }

  return JSON.stringify(safeHeaders)
}

function readHeaderValue(
  headers: Record<string, string | string[] | undefined> | Headers,
  headerName: string,
) {
  if (headers instanceof Headers) {
    return headers.get(headerName) ?? undefined
  }

  const directValue = headers[headerName] ?? headers[headerName.toLowerCase()]
  if (Array.isArray(directValue)) {
    return directValue.join(', ')
  }

  return directValue
}

/**
 * Middleware for Hono framework to create spans for HTTP requests
 */
export function createHonoTelemetryMiddleware() {
  const { trace, context: otelContext } = require('@opentelemetry/api')
  const tracer = trace.getTracer('hominem-hono')

  return async (c: unknown, next: () => Promise<void>) => {
    const ctx = c as { req: { method: string; routePath?: string; path: string; url: string; header: (name: string) => string | undefined }; res: { status: number } }
    const method = ctx.req.method
    const route = ctx.req.routePath || ctx.req.path

    await tracer.startActiveSpan(
      `${method} ${route}`,
      {
        attributes: {
          'http.request.method': method,
          'http.route': route,
          'http.request.url': ctx.req.url,
          'http.client_ip': ctx.req.header('x-forwarded-for') || ctx.req.header('x-real-ip') || 'unknown',
          'user_agent.original': ctx.req.header('user-agent') || 'unknown',
        },
      },
      otelContext.active(),
      async (span: Span) => {
        try {
          await next()

          // Set response attributes
          span.setAttribute('http.response.status_code', ctx.res.status)

          if (ctx.res.status >= 400) {
            span.setStatus({ code: 2, message: `HTTP ${ctx.res.status}` })
          } else {
            span.setStatus({ code: 1 })
          }
        } catch (error) {
          span.recordException(error as Error)
          span.setStatus({ code: 2, message: (error as Error).message })
          throw error
        } finally {
          span.end()
        }
      }
    )
  }
}
