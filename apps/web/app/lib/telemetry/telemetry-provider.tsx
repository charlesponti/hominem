import type { ReactNode } from 'react';

import { useTelemetry } from './use-telemetry';

// wires up the telemetry hook at app startup — see use-telemetry.ts/browser.ts
// for why this doesn't actually init OpenTelemetry client-side
export function TelemetryProvider({ children }: { children: ReactNode }) {
  useTelemetry();
  return <>{children}</>;
}
