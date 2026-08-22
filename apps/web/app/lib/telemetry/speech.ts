import { getClientEnv } from '../env.client';

export type SpeechPlaybackTelemetry = {
  requested(): void;
  firstPlayable(): void;
  paused(): void;
  stopped(): void;
  failed(error?: unknown): void;
  completed(): void;
};

type SpeechOutcome = 'completed' | 'stopped' | 'failed';

function sendSpeechEvent(input: {
  outcome: SpeechOutcome;
  requestToFirstPlayableMs: number | null;
  sessionDurationMs: number;
}) {
  try {
    const { VITE_PUBLIC_API_URL: apiUrl } = getClientEnv();
    void fetch(`${apiUrl}/api/telemetry/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      keepalive: true,
      body: JSON.stringify({
        version: 1,
        type: 'speech_playback',
        ...input,
      }),
    }).catch(() => undefined);
  } catch {
    // Telemetry must never interfere with audio playback.
  }
}

export function startSpeechPlaybackTelemetry(): SpeechPlaybackTelemetry {
  const startedAt = performance.now();
  let firstPlayableAt: number | null = null;
  let ended = false;

  const finish = (outcome: SpeechOutcome) => {
    if (ended) return;
    ended = true;
    const finishedAt = performance.now();
    sendSpeechEvent({
      outcome,
      requestToFirstPlayableMs:
        firstPlayableAt === null ? null : Math.max(0, Math.round(firstPlayableAt - startedAt)),
      sessionDurationMs: Math.max(0, Math.round(finishedAt - startedAt)),
    });
  };

  return {
    requested: () => undefined,
    firstPlayable: () => {
      firstPlayableAt ??= performance.now();
    },
    paused: () => undefined,
    stopped: () => finish('stopped'),
    failed: () => finish('failed'),
    completed: () => finish('completed'),
  };
}

export function endSpeechPlaybackTelemetry(telemetry: SpeechPlaybackTelemetry | null) {
  telemetry?.stopped();
}
