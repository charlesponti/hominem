import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSpeechUsageEstimate: vi.fn(),
  createIfAbsent: vi.fn(),
  getSpeechRunById: vi.fn(),
  getUsageEventById: vi.fn(),
  updateUsage: vi.fn(),
  markReconciliation: vi.fn(),
}));

vi.mock('@hominem/ai', () => ({
  AUDIO_TTS_MODEL: 'tts-model',
  getSpeechUsageEstimate: mocks.getSpeechUsageEstimate,
}));

vi.mock('@hominem/db', () => ({
  AIUsageEventRepository: {
    createIfAbsent: mocks.createIfAbsent,
    getById: mocks.getUsageEventById,
    updateUsage: mocks.updateUsage,
  },
  ChatSpeechRunRepository: {
    getById: mocks.getSpeechRunById,
    markReconciliation: mocks.markReconciliation,
  },
  db: {},
}));

import { reconcileSpeechUsage } from './speech-usage.service';

describe('reconcileSpeechUsage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSpeechRunById.mockResolvedValue({
      id: 'speech-run-id',
      usageEventId: 'event-id',
      providerGenerationId: 'gen-tts-1',
      status: 'succeeded',
      reconciliationStatus: 'pending',
      reconciliationAttempts: 0,
      characterCount: 1000,
    });
    mocks.getUsageEventById.mockResolvedValue({ model: 'tts-model' });
    mocks.getSpeechUsageEstimate.mockResolvedValue({
      provider: 'openrouter',
      model: 'tts-model',
      promptTokens: 10,
      completionTokens: 2,
      totalTokens: 12,
      costUsd: 0.01,
      cachedPromptTokens: null,
      reasoningTokens: null,
      characterCount: 1000,
      costPerCharacterUsd: 0.00001,
      costSource: 'openrouter_model_catalog',
    });
    mocks.createIfAbsent.mockResolvedValue(true);
    mocks.updateUsage.mockResolvedValue(true);
  });

  it('updates the linked usage event and marks the run reconciled', async () => {
    await reconcileSpeechUsage('speech-run-id');

    expect(mocks.getSpeechUsageEstimate).toHaveBeenCalledWith({
      model: 'tts-model',
      characterCount: 1000,
    });
    expect(mocks.createIfAbsent).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        id: 'event-id',
        feature: 'chat_speech',
        operation: 'speech',
      }),
    );
    expect(mocks.updateUsage).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ eventId: 'event-id', status: 'succeeded' }),
    );
    expect(mocks.markReconciliation).toHaveBeenCalledWith(
      {},
      { id: 'speech-run-id', status: 'succeeded' },
    );
  });

  it('keeps temporary pricing failures retryable', async () => {
    mocks.getSpeechUsageEstimate.mockRejectedValue(new Error('catalog not ready'));

    await expect(reconcileSpeechUsage('speech-run-id')).rejects.toThrow('catalog not ready');

    expect(mocks.markReconciliation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ id: 'speech-run-id', status: 'pending' }),
    );
  });

  it('does not charge a failed speech run', async () => {
    mocks.getSpeechRunById.mockResolvedValue({
      id: 'speech-run-id',
      usageEventId: 'event-id',
      providerGenerationId: 'gen-tts-1',
      status: 'failed',
      reconciliationStatus: 'pending',
      reconciliationAttempts: 2,
    });

    await reconcileSpeechUsage('speech-run-id');

    expect(mocks.markReconciliation).toHaveBeenCalledWith(
      {},
      { id: 'speech-run-id', status: 'succeeded', error: null },
    );
    expect(mocks.getSpeechUsageEstimate).not.toHaveBeenCalled();
  });
});
