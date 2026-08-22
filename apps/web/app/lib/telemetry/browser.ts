export interface BrowserTelemetry {
  shutdown(): Promise<void>;
  forceFlush(): Promise<void>;
}

// Browser events are sent through the authenticated API proxy. Keeping this
// initializer as a no-op preserves the existing provider boundary without
// putting an OTLP or Sentry credential in the Web bundle.
export function initTelemetry(_config?: unknown): BrowserTelemetry {
  return {
    shutdown: async () => {},
    forceFlush: async () => {},
  };
}
