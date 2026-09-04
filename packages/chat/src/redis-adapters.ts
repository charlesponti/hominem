import type { ToolResult } from './generation-machine';

export type ChatRedis = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode: 'EX', ttlSeconds: number) => Promise<unknown>;
};

export type RedisChatEffectStore = {
  get: (input: {
    generationId: string;
    idempotencyKey: string;
    toolName: string;
  }) => Promise<ToolResult | null>;
  save: (input: {
    generationId: string;
    idempotencyKey: string;
    toolName: string;
    result: ToolResult;
  }) => Promise<ToolResult>;
};

export function createRedisChatEffectStore(
  redis: ChatRedis,
  options: { keyPrefix?: string; ttlSeconds?: number } = {},
): RedisChatEffectStore {
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

export type ChatContextUsage = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number | null;
  updatedAt: string;
};

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
        completionTokens: number;
        totalTokens: number;
        costUsd: number | null;
      };
    }): Promise<void> => {
      await redis.set(
        `${keyPrefix}${input.chatId}`,
        JSON.stringify({
          model: input.model,
          promptTokens: input.usage.promptTokens,
          completionTokens: input.usage.completionTokens,
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
