import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSpeechGenerationUsage: vi.fn(),
  getById: vi.fn(),
  updateUsage: vi.fn(),
  markReconciliation: vi.fn(),
}));

vi.mock('@hominem/ai', () => ({
  getSpeechGenerationUsage: mocks.getSpeechGenerationUsage,
}));

vi.mock('@hominem/db', () => ({
  AIUsageEventRepository: { updateUsage: mocks.updateUsage },
  ChatSpeechRunRepository: {
    getById: mocks.getById,
    markReconciliation: mocks.markReconciliation,
  },
  db: {},
}));

import { reconcileSpeechUsage } from './speech-usage.service';

describe('reconcileSpeechUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getById.mockResolvedValue({
      id: 'speech-run-id',
      usageEventId: 'event-id',
      providerGenerationId: 'gen-tts-1',
      status: 'succeeded',
      reconciliationStatus: 'pending',
      reconciliationAttempts: 0,
    });
    mocks.getSpeechGenerationUsage.mockResolvedValue({
      provider: 'openrouter',
      model: 'tts-model',
      promptTokens: 10,
      completionTokens: 2,
      totalTokens: 12,
      costUsd: 0.01,
      cachedPromptTokens: null,
      reasoningTokens: null,
    });
    mocks.updateUsage.mockResolvedValue(true);
  });

  it('updates the linked usage event and marks the run reconciled', async () => {
    await reconcileSpeechUsage('speech-run-id');

    expect(mocks.getSpeechGenerationUsage).toHaveBeenCalledWith({ generationId: 'gen-tts-1' });
    expect(mocks.updateUsage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ eventId: 'event-id', status: 'succeeded' }),
    );
    expect(mocks.markReconciliation).toHaveBeenCalledWith(
      {},
      { id: 'speech-run-id', status: 'succeeded' },
    );
  });

  it('keeps temporary lookup failures retryable', async () => {
    mocks.getSpeechGenerationUsage.mockRejectedValue(new Error('not ready'));

    await expect(reconcileSpeechUsage('speech-run-id')).rejects.toThrow('not ready');

    expect(mocks.markReconciliation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ id: 'speech-run-id', status: 'pending' }),
    );
  });

  it('marks the run terminal after the final failed attempt', async () => {
    mocks.getById.mockResolvedValue({
      id: 'speech-run-id',
      usageEventId: 'event-id',
      providerGenerationId: 'gen-tts-1',
      status: 'failed',
      reconciliationStatus: 'pending',
      reconciliationAttempts: 2,
    });
    mocks.getSpeechGenerationUsage.mockRejectedValue(new Error('not found'));

    await reconcileSpeechUsage('speech-run-id');

    expect(mocks.markReconciliation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ id: 'speech-run-id', status: 'failed' }),
    );
  });
});
