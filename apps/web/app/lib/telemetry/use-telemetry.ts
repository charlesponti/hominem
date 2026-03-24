import { initTelemetry } from '@hominem/telemetry/browser';
import { useEffect, useRef } from 'react';

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

    // Get env vars from window (injected by server) or import.meta.env
    const env = (window as unknown as { ENV?: Record<string, string> }).ENV ?? {};

    // Check if telemetry is explicitly disabled
    if (
      env.OTEL_EXPORTER_OTLP_ENDPOINT === 'none' ||
      import.meta.env.VITE_OTEL_DISABLED === 'true'
    ) {
      console.log('[Telemetry] OpenTelemetry is disabled');
      return;
    }

    try {
      const telemetry = initTelemetry({
        serviceName: env.OTEL_SERVICE_NAME || 'hominem-web',
        serviceVersion: env.OTEL_SERVICE_VERSION || '0.0.0',
        environment: env.OTEL_DEPLOYMENT_ENVIRONMENT || 'development',
        otlpEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',
        samplingRatio: parseFloat(env.OTEL_TRACES_SAMPLER_ARG || '1.0'),
      });

      console.log('[Telemetry] OpenTelemetry initialized for hominem-web');

      // Cleanup on page unload
      return () => {
        telemetry.shutdown().catch(console.error);
      };
    } catch (error) {
      console.error('[Telemetry] Failed to initialize OpenTelemetry:', error);
      return undefined;
    }
  }, []);
}
