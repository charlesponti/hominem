import { logger } from '@hominem/telemetry';

export interface TelemetryConfig {
  serviceName: string;
  serviceVersion?: string;
  serviceNamespace?: string;
  environment?: string;
  otlpEndpoint?: string;
  otlpProtocol?: string;
  samplingRatio?: number;
  metricExportIntervalMillis?: number | undefined;
  attributes?: Record<string, string>;
}

export function parseOptionalNumber(value?: string): number | undefined {
  if (!value) return undefined;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function configureLogger(config: { serviceName?: string } = {}) {
  if (config.serviceName) {
    logger.debug('logger configured', { service_name: config.serviceName });
  }
}
