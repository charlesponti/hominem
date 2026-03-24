/**
 * Browser OpenTelemetry SDK initialization
 */

import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web'
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { propagation, trace, metrics, context as otelContext, type Span } from '@opentelemetry/api'
import { W3CTraceContextPropagator, W3CBaggagePropagator, CompositePropagator } from '@opentelemetry/core'
import { Resource } from '@opentelemetry/resources'
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_SERVICE_NAMESPACE,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions'
import type { TelemetryConfig } from '../shared/index.js'

/**
 * Browser telemetry SDK instance
 */
export interface BrowserTelemetry {
  /** Shutdown the SDK gracefully */
  shutdown(): Promise<void>
  /** Force flush all exporters */
  forceFlush(): Promise<void>
}

/**
 * Initialize OpenTelemetry for browser apps
 */
export function initTelemetry(explicitConfig?: Partial<TelemetryConfig>): BrowserTelemetry {
  // For browser, we need to handle the lack of process.env
  const config = getBrowserConfig(explicitConfig)
  const resource = createBrowserResource(config)

  // Set up propagator (W3C standard for browser)
  const propagator = new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new W3CBaggagePropagator(),
    ],
  })
  propagation.setGlobalPropagator(propagator)

  // Configure OTLP endpoint
  const otlpEndpoint = config.otlpEndpoint

  // Trace exporter and provider
  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  })

  const tracerProvider = new WebTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(traceExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 5000,
      exportTimeoutMillis: 30000,
    })],
  })

  tracerProvider.register()
  trace.setGlobalTracerProvider(tracerProvider)

  // Metrics provider
  const metricExporter = new OTLPMetricExporter({
    url: `${otlpEndpoint}/v1/metrics`,
  })

  const meterProvider = new MeterProvider({
    resource,
    readers: [
      new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000,
        exportTimeoutMillis: 30000,
      }),
    ],
  })
  metrics.setGlobalMeterProvider(meterProvider)

  // Instrument fetch API
  instrumentFetch(tracerProvider)

  // Instrument Web Vitals if available
  instrumentWebVitals(meterProvider)

  // Return control interface
  return {
    async shutdown(): Promise<void> {
      await tracerProvider.shutdown()
      await meterProvider.shutdown()
    },
    async forceFlush(): Promise<void> {
      await tracerProvider.forceFlush()
      await meterProvider.forceFlush()
    },
  }
}

/**
 * Get configuration for browser environment
 */
function getBrowserConfig(explicit?: Partial<TelemetryConfig>): TelemetryConfig {
  // In browser, we read from import.meta.env or window.ENV
  const env = (typeof window !== 'undefined' && (window as unknown as { ENV?: Record<string, string> }).ENV) || {}
  
  const serviceName = explicit?.serviceName || env.OTEL_SERVICE_NAME
  if (!serviceName) {
    throw new Error('OTEL_SERVICE_NAME is required for browser telemetry')
  }

  return {
    serviceName,
    serviceVersion: explicit?.serviceVersion || env.OTEL_SERVICE_VERSION || '0.0.0',
    serviceNamespace: explicit?.serviceNamespace || env.OTEL_SERVICE_NAMESPACE || 'hominem',
    environment: explicit?.environment || env.OTEL_DEPLOYMENT_ENVIRONMENT || 'development',
    otlpEndpoint: explicit?.otlpEndpoint || env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
    otlpProtocol: 'http/protobuf', // Browser only supports HTTP
    samplingRatio: explicit?.samplingRatio || parseFloat(env.OTEL_TRACES_SAMPLER_ARG || '1.0'),
    ...(explicit?.attributes !== undefined ? { attributes: explicit.attributes } : {}),
  }
}

/**
 * Create resource for browser environment
 */
function createBrowserResource(config: TelemetryConfig) {
  return new Resource({
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion || '0.0.0',
    [SEMRESATTRS_SERVICE_NAMESPACE]: config.serviceNamespace || 'hominem',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: config.environment || 'development',
    'host.name': typeof window !== 'undefined' ? window.location.hostname : 'browser',
    'browser.user_agent': typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    'browser.language': typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    ...config.attributes,
  })
}

/**
 * Instrument fetch API for automatic tracing
 */
function instrumentFetch(_tracerProvider: WebTracerProvider) {
  const tracer = trace.getTracer('browser-fetch')
  const originalFetch = window.fetch

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString()
    const method = init?.method || 'GET'

    return tracer.startActiveSpan(
      `HTTP ${method}`,
      {
        kind: 3, // Client span
        attributes: {
          'http.request.method': method,
          'http.request.url': url,
        },
      },
      otelContext.active(),
      async (span: Span) => {
        try {
          // Inject trace context into headers
          const headers = new Headers(init?.headers || {})
          const carrier: Record<string, string> = {}
          propagation.inject(otelContext.active(), carrier, {
            set: (h, key, value) => h[key] = value,
          })
          
          Object.entries(carrier).forEach(([key, value]) => {
            headers.set(key, value)
          })

          const fetchInput: RequestInfo = input instanceof URL ? input.toString() : input
          const response = await originalFetch.call(window, fetchInput, {
            ...init,
            headers,
          })

          span.setAttribute('http.response.status_code', response.status)
          
          if (response.status >= 400) {
            span.setStatus({ code: 2, message: `HTTP ${response.status}` })
          } else {
            span.setStatus({ code: 1 })
          }

          return response
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

/**
 * Instrument Core Web Vitals
 */
function instrumentWebVitals(meterProvider: MeterProvider) {
  const meter = meterProvider.getMeter('web-vitals')
  
  // Create histograms for each vital
  const lcpHistogram = meter.createHistogram('web_vitals_lcp', {
    description: 'Largest Contentful Paint',
    unit: 'ms',
  })
  
  const fidHistogram = meter.createHistogram('web_vitals_fid', {
    description: 'First Input Delay',
    unit: 'ms',
  })
  
  const clsHistogram = meter.createHistogram('web_vitals_cls', {
    description: 'Cumulative Layout Shift',
    unit: '1',
  })

  const fcpHistogram = meter.createHistogram('web_vitals_fcp', {
    description: 'First Contentful Paint',
    unit: 'ms',
  })

  const ttfbHistogram = meter.createHistogram('web_vitals_ttfb', {
    description: 'Time to First Byte',
    unit: 'ms',
  })

  // Try to use web-vitals library if available, otherwise use basic Performance API
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    // LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        if (lastEntry) {
          lcpHistogram.record(lastEntry.startTime)
        }
      })
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    } catch {
      // LCP not supported
    }

    // FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fidEntry = entry as PerformanceEventTiming
          if (fidEntry.processingStart && fidEntry.startTime) {
            fidHistogram.record(fidEntry.processingStart - fidEntry.startTime)
          }
        }
      })
      fidObserver.observe({ entryTypes: ['first-input'] })
    } catch {
      // FID not supported
    }

    // CLS
    let clsValue = 0
    try {
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
          if (!layoutShift.hadRecentInput) {
            clsValue += layoutShift.value
          }
        }
        clsHistogram.record(clsValue)
      })
      clsObserver.observe({ entryTypes: ['layout-shift'] })
    } catch {
      // CLS not supported
    }

    // FCP & TTFB from navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navEntry) {
          fcpHistogram.record(navEntry.responseStart - navEntry.startTime)
          ttfbHistogram.record(navEntry.responseStart - navEntry.startTime)
        }
      }, 0)
    })
  }
}
