import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const span = {
    end: vi.fn(),
    setStatus: vi.fn(),
    setAttribute: vi.fn(),
  };

  return {
    span,
    startSpan: vi.fn(() => span),
    info: vi.fn(),
  };
});

vi.mock('@hominem/telemetry', () => ({
  getTelemetryTracer: () => ({ startSpan: mocks.startSpan }),
  logger: { info: mocks.info },
}));

import { recordBrowserSpeechTelemetry } from './telemetry.service';

describe('recordBrowserSpeechTelemetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records a privacy-safe completed playback span', () => {
    recordBrowserSpeechTelemetry({
      version: 1,
      type: 'speech_playback',
      outcome: 'completed',
      requestToFirstPlayableMs: 450,
      sessionDurationMs: 3200,
    });

    expect(mocks.startSpan).toHaveBeenCalledWith(
      'speech.playback',
      expect.objectContaining({
        attributes: {
          'telemetry.source': 'web',
          'speech.outcome': 'completed',
          'speech.request_to_first_playable_ms': 450,
          'speech.session_duration_ms': 3200,
        },
      }),
    );
    expect(mocks.span.setStatus).toHaveBeenCalledWith({ code: 1 });
    expect(mocks.span.end).toHaveBeenCalledOnce();
    expect(mocks.info).toHaveBeenCalledWith('speech_browser_playback', {
      outcome: 'completed',
      requestToFirstPlayableMs: 450,
      sessionDurationMs: 3200,
    });
  });

  it('marks failed playback as an error without recording identifiers', () => {
    recordBrowserSpeechTelemetry({
      version: 1,
      type: 'speech_playback',
      outcome: 'failed',
      requestToFirstPlayableMs: null,
      sessionDurationMs: 100,
    });

    expect(mocks.span.setStatus).toHaveBeenCalledWith({ code: 2 });
    expect(JSON.stringify(mocks.startSpan.mock.calls)).not.toContain('messageId');
    expect(JSON.stringify(mocks.info.mock.calls)).not.toContain('generation');
  });
});
