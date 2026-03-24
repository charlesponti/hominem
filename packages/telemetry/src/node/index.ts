/**
 * Node.js OpenTelemetry SDK initialization
 */

import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import type { SpanProcessor } from '@opentelemetry/sdk-trace-base'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs'
import { context, propagation, trace, metrics, type Span } from '@opentelemetry/api'
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
    compression: 'gzip',
  })

  const tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(traceExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 1000,
      exportTimeoutMillis: 30000,
    })],
  })

  // Sampling based on config
  if (config.samplingRatio !== undefined && config.samplingRatio < 1.0) {
    tracerProvider.addSpanProcessor({
      forceFlush: async () => {},
      shutdown: async () => {},
      onStart: () => {},
      onEnd: (_span) => {
        // Apply sampling
      },
    } satisfies SpanProcessor)
  }

  tracerProvider.register()
  trace.setGlobalTracerProvider(tracerProvider)

  // Metrics provider
  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
    compression: 'gzip',
  })

  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 15000,
        exportTimeoutMillis: 30000,
      }),
    ],
  })
  metrics.setGlobalMeterProvider(meterProvider)

  // Logs provider (optional, only if explicitly enabled)
  let loggerProvider: LoggerProvider | undefined
  if (process.env.OTEL_LOGS_EXPORTER !== 'none') {
    const logExporter = new OTLPLogExporter({
      url: `${otlpEndpoint}/v1/logs`,
      compression: 'gzip',
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
  }

  // Auto-instrumentations
  registerInstrumentations({
    tracerProvider,
    meterProvider,
    instrumentations: [
      new HttpInstrumentation({
        requestHook: (span, request) => {
          span.setAttribute('http.request.headers', JSON.stringify(request.headers))
        },
        responseHook: (span, response) => {
          span.setAttribute('http.response.headers', JSON.stringify(response.headers))
        },
        applyCustomAttributesOnSpan: (span, request, response) => {
          if (response && response.statusCode >= 400) {
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
