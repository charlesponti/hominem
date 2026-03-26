import { initTelemetry } from '@hominem/telemetry/browser';
import { useEffect, useRef } from 'react';

import { resolveBrowserTelemetryConfig } from './config';

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

    if (import.meta.env.VITE_OTEL_DISABLED === 'true') {
      return;
    }

    const config = resolveBrowserTelemetryConfig(env);
    if (!config) {
      return;
    }

    try {
      const telemetry = initTelemetry(config);

      return () => {
        void telemetry.shutdown().catch(() => undefined);
      };
    } catch {
      return undefined;
    }
  }, []);
}
