import { logger } from '@hominem/utils/logger';
import { serve } from '@hono/node-server';
import { initTelemetry } from '@hominem/telemetry/node';

import { env } from './env';
import { createServer } from './server';

// Initialize OpenTelemetry telemetry
const telemetry = initTelemetry({
  serviceName: 'hominem-api',
  serviceVersion: process.env.npm_package_version || '0.0.0',
  environment: env.NODE_ENV || 'development',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  otlpProtocol: process.env.OTEL_EXPORTER_OTLP_PROTOCOL,
  samplingRatio: parseFloat(process.env.OTEL_TRACES_SAMPLER_ARG || '1.0'),
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('server_shutdown', { signal: 'SIGTERM' });
  await telemetry.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('server_shutdown', { signal: 'SIGINT' });
  await telemetry.shutdown();
  process.exit(0);
});

const app = createServer();
const port = Number.parseInt(env.PORT, 10);
const host = '0.0.0.0';

logger.info('server_started', { host, port });

serve({
  fetch: app.fetch,
  port,
  hostname: host,
  overrideGlobalObjects: false,
});
