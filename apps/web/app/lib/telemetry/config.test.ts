import { describe, expect, it } from 'vitest';

import { buildTelemetryWindowEnv, resolveBrowserTelemetryConfig } from './config';

describe('telemetry config', () => {
  it('omits the endpoint from injected runtime env when production has no OTLP endpoint', () => {
    expect(
      buildTelemetryWindowEnv({
        environment: 'production',
      }),
    ).toEqual({
      OTEL_DEPLOYMENT_ENVIRONMENT: 'production',
      OTEL_SERVICE_NAME: 'hominem-web',
    });
  });

  it('keeps localhost fallback in non-production environments', () => {
    expect(
      resolveBrowserTelemetryConfig({
        OTEL_DEPLOYMENT_ENVIRONMENT: 'development',
      }),
    ).toEqual({
      environment: 'development',
      otlpEndpoint: 'http://localhost:4318',
      samplingRatio: 1,
      serviceName: 'hominem-web',
      serviceVersion: '0.0.0',
    });
  });

  it('disables telemetry in production when no endpoint is configured', () => {
    expect(
      resolveBrowserTelemetryConfig({
        OTEL_DEPLOYMENT_ENVIRONMENT: 'production',
      }),
    ).toBeNull();
  });
});
