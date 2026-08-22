import { getTelemetryTracer, logger } from '@hominem/telemetry';
import { SpanStatusCode } from '@opentelemetry/api';

import type { BrowserSpeechTelemetry } from '../schemas/telemetry.schema';

const tracer = getTelemetryTracer('hominem.browser');

export function recordBrowserSpeechTelemetry(event: BrowserSpeechTelemetry): void {
  const endedAt = Date.now();
  const startedAt = endedAt - event.sessionDurationMs;
  const span = tracer.startSpan('speech.playback', {
    startTime: startedAt,
    attributes: {
      'telemetry.source': 'web',
      'speech.outcome': event.outcome,
      'speech.request_to_first_playable_ms': event.requestToFirstPlayableMs ?? -1,
      'speech.session_duration_ms': event.sessionDurationMs,
    },
  });

  if (event.outcome === 'failed') {
    span.setStatus({ code: SpanStatusCode.ERROR });
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }
  span.end(endedAt);

  logger.info('speech_browser_playback', {
    outcome: event.outcome,
    requestToFirstPlayableMs: event.requestToFirstPlayableMs,
    sessionDurationMs: event.sessionDurationMs,
  });
}
