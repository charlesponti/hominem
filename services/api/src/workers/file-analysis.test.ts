import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createChatCompletion: vi.fn(),
  recordAIUsageEvent: vi.fn(),
}));

vi.mock('@hominem/ai', () => ({
  createChatCompletion: mocks.createChatCompletion,
  getChatCompletionText: vi.fn(
    (result: { choices?: Array<{ message?: { content?: string } }> }) =>
      result.choices?.[0]?.message?.content ?? '',
  ),
  getChatCompletionUsage: vi.fn((result: { model: string; usage?: Record<string, unknown> }) => ({
    provider: 'openrouter',
    model: result.model,
    promptTokens: Number(result.usage?.promptTokens ?? 0),
    completionTokens: Number(result.usage?.completionTokens ?? 0),
    totalTokens: Number(result.usage?.totalTokens ?? 0),
    reportedTotalTokens: null,
    costUsd: Number(result.usage?.cost ?? 0),
    cachedPromptTokens: null,
    reasoningTokens: null,
  })),
}));

vi.mock('@hominem/services', () => ({
  recordAIUsageEvent: mocks.recordAIUsageEvent,
  startAIUsageTimer: () => () => 0,
}));

vi.mock('@hominem/telemetry', () => ({
  LOG_MESSAGES: {
    IMAGE_ANALYZE_ERROR: 'IMAGE_ANALYZE_ERROR',
    DOCUMENT_SUMMARIZE_ERROR: 'DOCUMENT_SUMMARIZE_ERROR',
  },
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { describeImageForChat, summarizeDocumentForChat } from './file-analysis';

describe('describeImageForChat', () => {
  beforeEach(() => {
    mocks.createChatCompletion.mockReset();
    mocks.recordAIUsageEvent.mockReset().mockResolvedValue(undefined);
  });

  it('records image analysis usage immediately after the provider responds', async () => {
    mocks.createChatCompletion.mockResolvedValueOnce({
      model: 'vision-model',
      usage: { promptTokens: 6, completionTokens: 3, totalTokens: 9, cost: 0.09 },
      choices: [{ message: { content: 'image summary' } }],
    });

    const description = await describeImageForChat(
      new TextEncoder().encode('tiny-image').buffer,
      'image/png',
      'file-id',
      'user-id',
    );

    expect(description).toBe('image summary');
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'file_image_analyze',
        usage: expect.objectContaining({ totalTokens: 9, costUsd: 0.09 }),
      }),
    );
  });

  it('records failed image analysis attempts without provider usage', async () => {
    mocks.createChatCompletion.mockRejectedValueOnce(
      Object.assign(new Error('quota'), { code: 'quota_exceeded', status: 429 }),
    );

    const description = await describeImageForChat(
      new TextEncoder().encode('tiny-image').buffer,
      'image/png',
      'file-id',
      'user-id',
    );

    expect(description).toBe('');
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'file_image_analyze',
        status: 'failed',
        error: expect.objectContaining({ code: 'quota_exceeded', status: 429 }),
      }),
    );
  });
});

describe('summarizeDocumentForChat', () => {
  beforeEach(() => {
    mocks.createChatCompletion.mockReset();
    mocks.recordAIUsageEvent.mockReset().mockResolvedValue(undefined);
  });

  it('skips summarization for short documents', async () => {
    const summary = await summarizeDocumentForChat(
      'short text',
      'file-id',
      'text/plain',
      'user-id',
    );

    expect(summary).toBe('');
    expect(mocks.createChatCompletion).not.toHaveBeenCalled();
  });

  it('records document summarization usage for long documents', async () => {
    mocks.createChatCompletion.mockResolvedValueOnce({
      model: 'summary-model',
      usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30, cost: 0.03 },
      choices: [{ message: { content: 'doc summary' } }],
    });

    const summary = await summarizeDocumentForChat(
      'x'.repeat(1001),
      'file-id',
      'text/plain',
      'user-id',
    );

    expect(summary).toBe('doc summary');
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'file_document_summarize',
        usage: expect.objectContaining({ totalTokens: 30, costUsd: 0.03 }),
      }),
    );
  });
});
