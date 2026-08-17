// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { userContext } from '../lib/middleware';

const mocks = vi.hoisted(() => ({
  createChatCompletion: vi.fn(),
  getPortfolio: vi.fn(),
  getSocialLinks: vi.fn(),
  formatPortfolioForLLM: vi.fn(),
  recordAIUsageEvent: vi.fn(),
  logError: vi.fn(),
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
  recordAIUsageEvent: mocks.recordAIUsageEvent,
  startAIUsageTimer: () => () => 0,
}));

vi.mock('@hominem/db', () => ({
  db: {},
  SocialLinksRepository: {
    get: mocks.getSocialLinks,
  },
}));

vi.mock('../lib/logger', () => ({
  logger: {
    error: mocks.logError,
    warn: vi.fn(),
  },
}));

vi.mock('../lib/portfolio.server', () => ({
  getResumePortfolioContext: mocks.getPortfolio,
}));

vi.mock('../lib/utils/portfolio-formatter', () => ({
  formatPortfolioForLLM: mocks.formatPortfolioForLLM,
}));

let action: typeof import('./api.resume.customize').action;

beforeAll(async () => {
  ({ action } = await import('./api.resume.customize'));
});

beforeEach(() => {
  mocks.getPortfolio.mockResolvedValue({
    id: 'portfolio-id',
    title: 'Portfolio',
  });
  mocks.getSocialLinks.mockResolvedValue(null);
  mocks.formatPortfolioForLLM.mockReturnValue('portfolio context');
  mocks.recordAIUsageEvent.mockResolvedValue(undefined);
  mocks.createChatCompletion
    .mockResolvedValueOnce({
      model: 'resume-model',
      usage: { promptTokens: 20, completionTokens: 30, totalTokens: 50, cost: 0.5 },
      choices: [{ message: { content: 'customized resume' } }],
    })
    .mockResolvedValueOnce({
      model: 'analysis-model',
      usage: { promptTokens: 5, completionTokens: 7, totalTokens: 12, cost: 0.12 },
      choices: [{ message: { content: '{"wrong":[]}' } }],
    });
});

function makeContext() {
  const { RouterContextProvider } = require('react-router');
  return new RouterContextProvider([
    [userContext, { id: 'user-id', email: 'test@example.com', name: 'Test User' }],
  ]);
}

function toRouteResponse(result: unknown): Response {
  if (result instanceof Response) {
    return result;
  }

  return Response.json(result);
}

describe('resume customize action', () => {
  it('records both provider calls even when job analysis fails validation', async () => {
    const request = new Request('http://localhost/api/resume/customize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        job_posting: 'a'.repeat(120),
        resumeFormat: 'professional',
        focusAreas: ['leadership'],
        targetLength: 'standard',
      }),
    });

    const response = toRouteResponse(
      await action({
        request,
        params: {},
        context: makeContext(),
        url: new URL(request.url),
        pattern: '/api/resume/customize',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      customizedResume: 'customized resume',
      jobAnalysis: null,
    });
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledTimes(2);
    expect(mocks.recordAIUsageEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        feature: 'career_resume_customize',
        operation: 'structured_output',
        usage: expect.objectContaining({ totalTokens: 12, costUsd: 0.12 }),
      }),
    );
  });
});
