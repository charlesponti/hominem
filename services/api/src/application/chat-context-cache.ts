import type { AIUsageMetrics } from '@hominem/ai';
import { createRedisChatContextCache } from '@hominem/chat/adapters/redis';
import { redis } from '@hominem/services/redis';

const chatContextCache = createRedisChatContextCache(redis);

export const chatContextCacheKey = chatContextCache.key;

export async function cacheCompletedChatContext(input: {
  chatId: string;
  model: string;
  usage: AIUsageMetrics;
}): Promise<void> {
  await chatContextCache.recordCompletion(input);
}
