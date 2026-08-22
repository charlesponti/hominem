import { logger, LOG_MESSAGES } from '@hominem/telemetry';
import { initTelemetry } from '@hominem/telemetry/node';
import * as Sentry from '@sentry/node';

import { env } from './env';

type ShutdownTask = () => Promise<void> | void;

export function initRuntime(serviceName: string) {
  if (env.SENTRY_DSN && env.NODE_ENV !== 'development') {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: 0,
      skipOpenTelemetrySetup: true,
    });
  }

  const telemetry = initTelemetry({
    serviceName,
    serviceVersion: process.env.npm_package_version || '0.0.0',
    environment: env.NODE_ENV,
    ...(env.OTEL_EXPORTER_OTLP_ENDPOINT ? { otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT } : {}),
    ...(env.OTEL_EXPORTER_OTLP_PROTOCOL ? { otlpProtocol: env.OTEL_EXPORTER_OTLP_PROTOCOL } : {}),
    ...(env.OTEL_EXPORTER_OTLP_HEADERS
      ? { otlpHeaders: parseOtlpHeaders(env.OTEL_EXPORTER_OTLP_HEADERS) }
      : {}),
    samplingRatio: env.OTEL_TRACES_SAMPLER_ARG,
  });

  const installSignalHandlers = (...tasks: ShutdownTask[]) => {
    const shutdown = async (signal: NodeJS.Signals) => {
      logger.info(LOG_MESSAGES.SERVER_SHUTDOWN, { serviceName, signal });
      for (const task of tasks) {
        await task();
      }
      await telemetry.shutdown();
      process.exit(0);
    };

    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });
  };

  return {
    installSignalHandlers,
  };
}

function parseOtlpHeaders(value: string): Record<string, string> {
  return Object.fromEntries(
    value
      .split(',')
      .map((entry) => entry.trim().split('='))
      .filter((parts): parts is [string, string] => parts.length === 2 && parts[0] !== '')
      .map(([key, headerValue]) => [key, decodeURIComponent(headerValue)]),
  );
}
