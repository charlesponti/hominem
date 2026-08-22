import { trace } from '@opentelemetry/api';

export function getTelemetryTracer(scope = 'hominem') {
  return trace.getTracer(scope);
}
