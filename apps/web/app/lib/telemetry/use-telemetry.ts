import { logger } from '@hominem/telemetry';
import { useEffect, useRef } from 'react';

import { getClientEnv } from '../env.client';
import { initTelemetry } from './browser';

/**
 * Hook to initialize OpenTelemetry in the browser
 * Should be called once at app startup
 */
export function useTelemetry() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Only initialize in browser
    if (typeof window === 'undefined') return;

    const clientEnv = getClientEnv();

    // Check if telemetry is explicitly disabled
    if (
      clientEnv.VITE_OTEL_EXPORTER_OTLP_ENDPOINT === 'none' ||
      clientEnv.VITE_OTEL_DISABLED === 'true'
    ) {
      return;
    }

    try {
      const telemetry = initTelemetry({
        serviceName: clientEnv.VITE_OTEL_SERVICE_NAME,
        serviceVersion: clientEnv.VITE_OTEL_SERVICE_VERSION,
        environment: clientEnv.VITE_OTEL_DEPLOYMENT_ENVIRONMENT,
        otlpEndpoint: clientEnv.VITE_OTEL_EXPORTER_OTLP_ENDPOINT,
        samplingRatio: parseFloat(clientEnv.VITE_OTEL_TRACES_SAMPLER_ARG),
      });

      // Cleanup on page unload
      return () => {
        telemetry.shutdown().catch((error) => logger.error('telemetry_shutdown_failed', { error }));
      };
    } catch (error) {
      logger.error('telemetry_init_failed', { error: error as Error });
      return undefined;
    }
  }, []);
}
