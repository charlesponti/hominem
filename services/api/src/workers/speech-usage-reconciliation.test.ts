import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  add: vi.fn().mockResolvedValue(undefined),
  listPending: vi.fn().mockResolvedValue([{ id: 'speech-run-id' }]),
  worker: { on: vi.fn(), close: vi.fn() },
  Worker: vi.fn(),
}));

vi.mock('@hominem/db/chats', () => ({
  ChatSpeechRunRepository: { listPending: mocks.listPending },
  db: {},
}));

vi.mock('@hominem/queues', () => ({
  QUEUE_NAMES: { SPEECH_USAGE_RECONCILIATION: 'speech-usage-reconciliation' },
  speechUsageReconciliationQueue: { add: mocks.add },
}));

vi.mock('@hominem/services/redis', () => ({ redis: {} }));
vi.mock('@hominem/telemetry', () => ({
  getTelemetryTracer: () => ({
    startSpan: () => ({
      end: vi.fn(),
      recordException: vi.fn(),
      setStatus: vi.fn(),
    }),
  }),
  logger: { error: vi.fn() },
}));
vi.mock('bullmq', () => ({
  Worker: class {
    constructor(...args: unknown[]) {
      mocks.Worker(...args);
      return mocks.worker;
    }
  },
}));
vi.mock('../application/speech-usage.service', () => ({ reconcileSpeechUsage: vi.fn() }));

import { startSpeechUsageReconciliationWorker } from './speech-usage-reconciliation';

describe('speech usage reconciliation worker', () => {
  it('starts the worker and requeues pending runs on startup', async () => {
    startSpeechUsageReconciliationWorker();
    await Promise.resolve();

    expect(mocks.Worker).toHaveBeenCalledWith('speech-usage-reconciliation', expect.any(Function), {
      connection: {},
    });
    expect(mocks.add).toHaveBeenCalledWith(
      'reconcile-speech-usage',
      { speechRunId: 'speech-run-id' },
      expect.objectContaining({ attempts: 3, jobId: 'speech-run-id' }),
    );
  });
});
