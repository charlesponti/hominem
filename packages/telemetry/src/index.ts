/**
 * Main telemetry package exports
 */

export {
  // Configuration
  type TelemetryConfig,
  getTelemetryConfig,
  createResource,
  DEFAULT_OTLP_ENDPOINT,
  DEFAULT_SAMPLING_RATIO,
  
  // Context keys
  TELEMETRY_CONTEXT_KEYS,
  
  // Semantic conventions
  HTTP_ATTRIBUTES,
  DB_ATTRIBUTES,
  MESSAGING_ATTRIBUTES,
  ATTRIBUTE_VALUES,
  
  // Logging utilities
  getSpanContextForLogs,
} from './shared/index.js'
