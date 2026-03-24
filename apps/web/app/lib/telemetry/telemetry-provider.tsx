import type { ReactNode } from 'react';

import { useTelemetry } from './use-telemetry';

/**
 * Telemetry provider component
 * Initializes OpenTelemetry when the app starts
 */
export function TelemetryProvider({ children }: { children: ReactNode }) {
  useTelemetry();
  return <>{children}</>;
}
