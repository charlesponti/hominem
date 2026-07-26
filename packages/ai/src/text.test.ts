import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  createStructuredChatCompletion,
  getStructuredOutputUsage,
  StructuredOutputError,
} from './text';

const createChatSend = vi.fn();

vi.mock('./shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./shared')>();
  return {
    ...actual,
    createOpenRouterClient: () => ({
      chat: {
        send: createChatSend,
      },
    }),
  };
});

describe('createStructuredChatCompletion', () => {
  it('retains usage when json parsing fails after the provider responds', async () => {
    createChatSend.mockResolvedValueOnce({
      model: 'model',
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        cost: 0.25,
      },
      choices: [{ message: { content: '{not-json' } }],
    });

    const result = createStructuredChatCompletion({
      model: 'model',
      messages: [{ role: 'user', content: 'hello' }],
      schema: z.object({ ok: z.boolean() }),
      schemaName: 'test_schema',
    });

    await expect(result).rejects.toBeInstanceOf(StructuredOutputError);
    await expect(result).rejects.toMatchObject({
      usage: expect.objectContaining({
        totalTokens: 15,
        costUsd: 0.25,
      }),
    });
  });

  it('retains usage when schema validation fails after the provider responds', async () => {
    createChatSend.mockResolvedValueOnce({
      model: 'model',
      usage: {
        promptTokens: 6,
        completionTokens: 4,
        totalTokens: 10,
        cost: 0,
      },
      choices: [{ message: { content: JSON.stringify({ ok: 'nope' }) } }],
    });

    const result = createStructuredChatCompletion({
      model: 'model',
      messages: [{ role: 'user', content: 'hello' }],
      schema: z.object({ ok: z.boolean() }),
      schemaName: 'test_schema',
    });

    await expect(result).rejects.toBeInstanceOf(StructuredOutputError);
    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining('ok: Invalid input'),
      usage: expect.objectContaining({
        totalTokens: 10,
        costUsd: 0,
      }),
    });
  });
});

describe('getStructuredOutputUsage', () => {
  it('reads usage from either a successful result or a structured-output error', () => {
    const usage = {
      provider: 'openrouter' as const,
      model: 'model',
      promptTokens: 1,
      completionTokens: 2,
      totalTokens: 3,
      reportedTotalTokens: null,
      costUsd: null,
      cachedPromptTokens: null,
      reasoningTokens: null,
    };

    expect(getStructuredOutputUsage({ output: { ok: true }, usage })).toBe(usage);
    expect(getStructuredOutputUsage(new StructuredOutputError('bad', { usage }))).toBe(usage);
  });
});
