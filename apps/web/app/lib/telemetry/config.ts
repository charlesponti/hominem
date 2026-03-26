export interface WebTelemetryEnv {
  OTEL_DEPLOYMENT_ENVIRONMENT?: string;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_SERVICE_NAME?: string;
  OTEL_SERVICE_VERSION?: string;
  OTEL_TRACES_SAMPLER_ARG?: string;
}

export function buildTelemetryWindowEnv({
  environment,
  otlpEndpoint,
  samplerArg,
}: {
  environment: string;
  otlpEndpoint?: string;
  samplerArg?: string;
}) {
  return {
    OTEL_DEPLOYMENT_ENVIRONMENT: environment,
    ...(otlpEndpoint ? { OTEL_EXPORTER_OTLP_ENDPOINT: otlpEndpoint } : {}),
    OTEL_SERVICE_NAME: 'hominem-web',
    ...(samplerArg ? { OTEL_TRACES_SAMPLER_ARG: samplerArg } : {}),
  };
}

export function resolveBrowserTelemetryConfig(env: WebTelemetryEnv) {
  const environment = env.OTEL_DEPLOYMENT_ENVIRONMENT || 'development';
  const otlpEndpoint =
    env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    (environment === 'production' ? undefined : 'http://localhost:4318');

  if (!otlpEndpoint || otlpEndpoint === 'none') {
    return null;
  }

  return {
    environment,
    otlpEndpoint,
    samplingRatio: Number.parseFloat(env.OTEL_TRACES_SAMPLER_ARG || '1.0'),
    serviceName: env.OTEL_SERVICE_NAME || 'hominem-web',
    serviceVersion: env.OTEL_SERVICE_VERSION || '0.0.0',
  };
}
