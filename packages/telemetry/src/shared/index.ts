/**
 * Shared telemetry utilities and configuration
 */

import { Resource } from '@opentelemetry/resources'
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_SERVICE_NAMESPACE,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_HOST_NAME,
  SEMRESATTRS_PROCESS_PID,
} from '@opentelemetry/semantic-conventions'

/**
 * Telemetry configuration options
 */
export interface TelemetryConfig {
  /** Service name (e.g., 'hominem-api') */
  serviceName: string
  /** Service version (e.g., '1.0.0') */
  serviceVersion?: string
  /** Service namespace (e.g., 'hominem') */
  serviceNamespace?: string
  /** Environment (e.g., 'development', 'production') */
  environment?: string
  /** OTLP endpoint URL */
  otlpEndpoint?: string
  /** OTLP protocol: 'http/protobuf' or 'grpc' */
  otlpProtocol?: string
  /** Sampling ratio (0.0 to 1.0) */
  samplingRatio?: number
  /** Additional resource attributes */
  attributes?: Record<string, string>
}

/**
 * Default OTLP endpoint for local development
 */
export const DEFAULT_OTLP_ENDPOINT = 'http://localhost:4318'

/**
 * Default sampling ratio for development
 */
export const DEFAULT_SAMPLING_RATIO = 1.0

/**
 * Get telemetry configuration from environment variables and explicit options
 */
export function getTelemetryConfig(explicit?: Partial<TelemetryConfig>): TelemetryConfig {
  const serviceName = explicit?.serviceName || process.env.OTEL_SERVICE_NAME
  if (!serviceName) {
    throw new Error('OTEL_SERVICE_NAME is required. Set it via environment variable or explicit config.')
  }

  return {
    serviceName,
    serviceVersion: explicit?.serviceVersion || process.env.OTEL_SERVICE_VERSION || '0.0.0',
    serviceNamespace: explicit?.serviceNamespace || process.env.OTEL_SERVICE_NAMESPACE || 'hominem',
    environment: explicit?.environment || process.env.OTEL_DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV || 'development',
    otlpEndpoint: explicit?.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT || DEFAULT_OTLP_ENDPOINT,
    otlpProtocol: explicit?.otlpProtocol || process.env.OTEL_EXPORTER_OTLP_PROTOCOL || 'http/protobuf',
    samplingRatio: explicit?.samplingRatio || parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG || '1.0'),
    attributes: parseAttributes(process.env.OTEL_RESOURCE_ATTRIBUTES),
    ...explicit?.attributes,
  }
}

/**
 * Parse resource attributes from environment variable string
 * Format: key1=value1,key2=value2
 */
function parseAttributes(attrString?: string): Record<string, string> {
  if (!attrString) return {}
  
  const attrs: Record<string, string> = {}
  const pairs = attrString.split(',')
  
  for (const pair of pairs) {
    const [key, value] = pair.split('=')
    if (key && value) {
      attrs[key.trim()] = value.trim()
    }
  }
  
  return attrs
}

/**
 * Create OpenTelemetry Resource from configuration
 */
export function createResource(config: TelemetryConfig): Resource {
  const attributes: Record<string, string | number> = {
    [SEMRESATTRS_SERVICE_NAME]: config.serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: config.serviceVersion || '0.0.0',
    [SEMRESATTRS_SERVICE_NAMESPACE]: config.serviceNamespace || 'hominem',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: config.environment || 'development',
    [SEMRESATTRS_HOST_NAME]: getHostname(),
    [SEMRESATTRS_PROCESS_PID]: process.pid,
    ...config.attributes,
  }

  return new Resource(attributes)
}

/**
 * Get hostname safely
 */
function getHostname(): string {
  try {
    // Node.js environment
    if (typeof process !== 'undefined' && process.env) {
      const os = require('os')
      return os.hostname()
    }
  } catch {
    // Browser environment or fallback
  }
  return 'unknown'
}

/**
 * Telemetry context keys for correlation
 */
export const TELEMETRY_CONTEXT_KEYS = {
  /** Request ID for correlation */
  REQUEST_ID: 'request.id',
  /** User ID for attribution */
  USER_ID: 'user.id',
  /** Organization ID for multi-tenancy */
  ORG_ID: 'org.id',
  /** Session ID for session tracking */
  SESSION_ID: 'session.id',
  /** Trace ID for log correlation */
  TRACE_ID: 'trace.id',
  /** Span ID for log correlation */
  SPAN_ID: 'span.id',
} as const

/**
 * HTTP semantic convention attributes
 */
export const HTTP_ATTRIBUTES = {
  method: 'http.request.method',
  url: 'http.request.url',
  route: 'http.route',
  statusCode: 'http.response.status_code',
  requestSize: 'http.request.body.size',
  responseSize: 'http.response.body.size',
  clientIp: 'http.client_ip',
  userAgent: 'user_agent.original',
} as const

/**
 * Database semantic convention attributes
 */
export const DB_ATTRIBUTES = {
  system: 'db.system',
  name: 'db.name',
  statement: 'db.statement',
  operation: 'db.operation',
  table: 'db.sql.table',
} as const

/**
 * Messaging semantic convention attributes (for queues/jobs)
 */
export const MESSAGING_ATTRIBUTES = {
  system: 'messaging.system',
  destination: 'messaging.destination',
  operation: 'messaging.operation',
  messageId: 'messaging.message.id',
  conversationId: 'messaging.message.conversation_id',
} as const

/**
 * Standard attribute values
 */
export const ATTRIBUTE_VALUES = {
  dbSystem: {
    postgres: 'postgresql',
    redis: 'redis',
  },
  messagingSystem: {
    bullmq: 'bullmq',
    sqs: 'AmazonSQS',
    kafka: 'kafka',
  },
  messagingOperation: {
    publish: 'publish',
    receive: 'receive',
    process: 'process',
  },
} as const

/**
 * Utility to safely get current span context info for logging
 */
export function getSpanContextForLogs(): { trace_id?: string; span_id?: string } {
  try {
    const { trace, context } = require('@opentelemetry/api')
    const currentSpan = trace.getSpan(context.active())
    
    if (currentSpan) {
      const spanContext = currentSpan.spanContext()
      if (spanContext.isValid) {
        return {
          trace_id: spanContext.traceId,
          span_id: spanContext.spanId,
        }
      }
    }
  } catch {
    // OTel not initialized or not available
  }
  
  return {}
}
