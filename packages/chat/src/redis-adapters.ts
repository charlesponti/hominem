import type { GenerationEffectStore, ToolResult } from './generation-machine';

export type ChatRedis = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode: 'EX', ttlSeconds: number) => Promise<unknown>;
};

export function createRedisChatEffectStore(
  redis: ChatRedis,
  options: { keyPrefix?: string; ttlSeconds?: number } = {},
): GenerationEffectStore {
  const keyPrefix = options.keyPrefix ?? 'chat:effect:';
  const ttlSeconds = options.ttlSeconds ?? 60 * 60 * 24 * 30;
  const key = (input: { generationId: string; idempotencyKey: string; toolName: string }) =>
    `${keyPrefix}${input.generationId}:${input.idempotencyKey}:${input.toolName}`;

  return {
    get: async (input) => {
      const value = await redis.get(key(input));
      if (!value) return null;
      try {
        return JSON.parse(value) as ToolResult;
      } catch {
        return null;
      }
    },
    save: async (input) => {
      await redis.set(key(input), JSON.stringify(input.result), 'EX', ttlSeconds);
      return input.result;
    },
  };
}

export function createRedisChatContextCache(
  redis: ChatRedis,
  options: { keyPrefix?: string; ttlSeconds?: number; now?: () => Date } = {},
) {
  const keyPrefix = options.keyPrefix ?? 'chat:context-window:';
  const ttlSeconds = options.ttlSeconds ?? 60 * 60 * 24 * 30;
  const now = options.now ?? (() => new Date());

  return {
    key: (chatId: string) => `${keyPrefix}${chatId}`,
    recordCompletion: async (input: {
      chatId: string;
      model: string;
      usage: {
        promptTokens: number;
        outputTokens: number;
        totalTokens: number;
        costUsd: number | null;
      };
    }): Promise<void> => {
      await redis.set(
        `${keyPrefix}${input.chatId}`,
        JSON.stringify({
          model: input.model,
          promptTokens: input.usage.promptTokens,
          outputTokens: input.usage.outputTokens,
          totalTokens: input.usage.totalTokens,
          costUsd: input.usage.costUsd,
          updatedAt: now().toISOString(),
        }),
        'EX',
        ttlSeconds,
      );
    },
  };
}
