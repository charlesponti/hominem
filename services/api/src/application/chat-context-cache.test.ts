import { beforeEach, describe, expect, it, vi } from 'vitest';

const redisSet = vi.fn();

vi.mock('@hominem/services/redis', () => ({
  redis: { set: redisSet },
}));

const { cacheCompletedChatContext, chatContextCacheKey } = await import('./chat-context-cache');

describe('chat context cache', () => {
  beforeEach(() => {
    redisSet.mockReset();
    redisSet.mockResolvedValue('OK');
  });

  it('stores the latest completed usage once with a cache expiry', async () => {
    await cacheCompletedChatContext({
      chatId: 'chat-1',
      model: 'test-model',
      usage: {
        provider: 'openrouter',
        model: 'test-model',
        promptTokens: 12,
        completionTokens: 5,
        totalTokens: 17,
        costUsd: null,
        reportedTotalTokens: null,
        cachedPromptTokens: null,
        reasoningTokens: null,
      },
    });

    expect(redisSet).toHaveBeenCalledOnce();
    const [key, rawValue, mode, ttl] = redisSet.mock.calls[0] as [string, string, string, number];
    expect(key).toBe(chatContextCacheKey('chat-1'));
    expect(JSON.parse(rawValue)).toMatchObject({
      model: 'test-model',
      promptTokens: 12,
      completionTokens: 5,
      totalTokens: 17,
    });
    expect(mode).toBe('EX');
    expect(ttl).toBe(60 * 60 * 24 * 30);
  });
});
