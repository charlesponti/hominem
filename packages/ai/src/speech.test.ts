import { describe, expect, it, vi } from 'vitest';

const { createClient, createSpeech, getGeneration } = vi.hoisted(() => ({
  createClient: vi.fn(),
  createSpeech: vi.fn(),
  getGeneration: vi.fn(),
}));

vi.mock('./shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./shared')>();
  return {
    ...actual,
    createOpenRouterClient: createClient,
  };
});

import { getSpeechGenerationUsage, synthesizeSpeechStream } from './speech';

describe('speech usage metadata', () => {
  it('preserves the provider generation ID from the TTS response header', async () => {
    const audio = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.close();
      },
    });
    const request = Object.assign(Promise.resolve(audio), {
      $inspect: vi.fn().mockResolvedValue([
        audio,
        {
          status: 'complete',
          response: new Response(null, { headers: { 'X-Generation-Id': 'gen-tts-1' } }),
        },
      ]),
    });
    createSpeech.mockReturnValue(request);
    createClient.mockReturnValue({ tts: { createSpeech }, generations: { getGeneration } });

    const result = await synthesizeSpeechStream({ text: 'Hello' });

    expect(result.generationId).toBe('gen-tts-1');
  });

  it('maps OpenRouter generation accounting into the shared usage shape', async () => {
    getGeneration.mockResolvedValue({
      data: {
        model: 'tts-model',
        tokensPrompt: 12,
        tokensCompletion: 3,
        nativeTokensCached: 2,
        nativeTokensReasoning: 1,
        totalCost: 0.0042,
      },
    });
    createClient.mockReturnValue({ tts: { createSpeech }, generations: { getGeneration } });

    await expect(getSpeechGenerationUsage({ generationId: 'gen-tts-1' })).resolves.toEqual({
      provider: 'openrouter',
      model: 'tts-model',
      promptTokens: 12,
      completionTokens: 3,
      totalTokens: 15,
      reportedTotalTokens: null,
      costUsd: 0.0042,
      cachedPromptTokens: 2,
      reasoningTokens: 1,
    });
  });
});
