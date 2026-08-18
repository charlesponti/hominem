// @vitest-environment node

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { userContext } from '../lib/middleware';

const mocks = vi.hoisted(() => ({
  scrapeJobPosting: vi.fn(),
  recordAIUsageEvent: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@hominem/ai', () => ({
  recordAIUsageEvent: mocks.recordAIUsageEvent,
}));

vi.mock('~/lib/logger', () => ({
  logger: {
    error: mocks.logError,
  },
}));

vi.mock('~/lib/services/job-scraping.service', () => ({
  scrapeJobPosting: mocks.scrapeJobPosting,
  parseScrapedJobPostingContent: vi.fn(() => {
    throw new Error('Failed to parse model response as JSON');
  }),
}));

let action: typeof import('./api.job.scrape').action;

beforeAll(async () => {
  ({ action } = await import('./api.job.scrape'));
});

beforeEach(() => {
  mocks.recordAIUsageEvent.mockResolvedValue(undefined);
  mocks.scrapeJobPosting.mockResolvedValue({
    success: true,
    content: '{not-json',
    model: 'job-model',
    durationMs: 1234,
    usage: {
      provider: 'openrouter',
      model: 'job-model',
      promptTokens: 10,
      completionTokens: 4,
      totalTokens: 14,
      reportedTotalTokens: null,
      costUsd: 0.22,
      cachedPromptTokens: null,
      reasoningTokens: null,
    },
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

  if (
    result &&
    typeof result === 'object' &&
    'type' in result &&
    result.type === 'DataWithResponseInit' &&
    'data' in result
  ) {
    const init =
      'init' in result && result.init && typeof result.init === 'object' ? result.init : undefined;

    return Response.json(result.data, init as ResponseInit | undefined);
  }

  return Response.json(result);
}

describe('job scrape action', () => {
  it('records usage before parse failures become a 400 response', async () => {
    const request = new Request('http://localhost/api/job/scrape', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com/job' }),
    });

    const response = toRouteResponse(
      await action({
        request,
        params: {},
        context: makeContext(),
        url: new URL(request.url),
        pattern: '/api/job/scrape',
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error:
        'We couldn’t read the job details from this posting. You can retry or paste the description.',
    });
    expect(mocks.recordAIUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: 'career_job_scrape',
        usage: expect.objectContaining({ totalTokens: 14, costUsd: 0.22 }),
        durationMs: 1234,
      }),
    );
  });
});
