export interface BrowserTelemetry {
  shutdown(): Promise<void>;
  forceFlush(): Promise<void>;
}

// browser events go through the authenticated API proxy, so this stays a
// no-op — that way we don't need an OTLP or Sentry credential in the web bundle
export function initTelemetry(_config?: unknown): BrowserTelemetry {
  return {
    shutdown: async () => {},
    forceFlush: async () => {},
  };
}
