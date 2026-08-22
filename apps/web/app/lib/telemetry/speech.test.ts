// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { endSpeechPlaybackTelemetry, startSpeechPlaybackTelemetry } from './speech';

vi.mock('../env.client', () => ({
  getClientEnv: () => ({ VITE_PUBLIC_API_URL: 'https://api.example.test' }),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('speech playback telemetry', () => {
  it('sends one bounded completion event through the API proxy', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const telemetry = startSpeechPlaybackTelemetry();
    telemetry.requested();
    telemetry.firstPlayable();
    telemetry.completed();
    telemetry.stopped();
    await Promise.resolve();

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.example.test/api/telemetry/events');
    expect(request.method).toBe('POST');
    expect(request.credentials).toBe('include');
    expect(JSON.parse(String(request.body))).toMatchObject({
      version: 1,
      type: 'speech_playback',
      outcome: 'completed',
    });
  });

  it('reports a failed playback without throwing when the proxy is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    expect(() => {
      const telemetry = startSpeechPlaybackTelemetry();
      telemetry.failed();
      endSpeechPlaybackTelemetry(telemetry);
    }).not.toThrow();
  });
});
