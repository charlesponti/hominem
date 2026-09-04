import { aiUsageMetrics } from '@hominem/utils/testing';
import { describe, expect, it, vi } from 'vitest';

import { createRedisChatContextCache, createRedisChatEffectStore } from './redis-adapters';

describe('Redis chat adapters', () => {
  it('round-trips an idempotent tool result with expiry', async () => {
    let stored: string | null = null;
    const redis = {
      get: vi.fn(async () => stored),
      set: vi.fn(async (_key: string, value: string) => {
        stored = value;
      }),
    };
    const effects = createRedisChatEffectStore(redis);
    const input = {
      generationId: 'generation-1',
      idempotencyKey: 'effect-1',
      toolName: 'places.list',
    };
    const result = { callId: 'call-1', toolName: input.toolName, content: '[]', error: false };

    await expect(effects.get(input)).resolves.toBeNull();
    await effects.save({ ...input, result });
    await expect(effects.get(input)).resolves.toEqual(result);
    expect(redis.set).toHaveBeenCalledWith(
      'chat:effect:generation-1:effect-1:places.list',
      JSON.stringify(result),
      'EX',
      60 * 60 * 24 * 30,
    );
  });

  it('writes completed context usage once through the adapter contract', async () => {
    const redis = { get: vi.fn(), set: vi.fn(async () => undefined) };
    const cache = createRedisChatContextCache(redis, { now: () => new Date('2026-01-01') });
    const usage = { ...aiUsageMetrics, promptTokens: 1, outputTokens: 2, totalTokens: 3 };

    await cache.recordCompletion({
      chatId: 'chat-1',
      model: 'test-model',
      usage,
    });

    expect(redis.set).toHaveBeenCalledOnce();
    expect(redis.set).toHaveBeenCalledWith(
      'chat:context-window:chat-1',
      JSON.stringify({
        model: 'test-model',
        promptTokens: usage.promptTokens,
        outputTokens: usage.outputTokens,
        totalTokens: usage.totalTokens,
        costUsd: usage.costUsd,
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
      'EX',
      60 * 60 * 24 * 30,
    );
  });
});
