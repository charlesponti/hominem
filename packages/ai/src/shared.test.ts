import { describe, expect, it } from 'vitest';

import {
  normalizeOpenRouterChatUsage,
  normalizeOpenRouterEmbeddingUsage,
  normalizeOpenRouterError,
} from './shared';

describe('normalizeOpenRouterChatUsage', () => {
  it('returns null when usage is missing', () => {
    expect(normalizeOpenRouterChatUsage('model', null)).toBeNull();
  });

  it('uses canonical prompt plus completion tokens when provider total differs', () => {
    expect(
      normalizeOpenRouterChatUsage('model', {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 99,
        cost: 0.12,
      }),
    ).toMatchObject({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
      reportedTotalTokens: 99,
      costUsd: 0.12,
    });
  });

  it('preserves zero-cost usage', () => {
    expect(
      normalizeOpenRouterChatUsage('model', {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
        cost: 0,
      }),
    ).toMatchObject({
      totalTokens: 3,
      reportedTotalTokens: null,
      costUsd: 0,
    });
  });

  it('preserves null cost usage', () => {
    expect(
      normalizeOpenRouterChatUsage('model', {
        promptTokens: 1,
        completionTokens: 2,
        totalTokens: 3,
        cost: null,
      }),
    ).toMatchObject({
      totalTokens: 3,
      costUsd: null,
    });
  });
});

describe('normalizeOpenRouterEmbeddingUsage', () => {
  it('uses prompt tokens as the canonical total when the provider total is missing', () => {
    expect(
      normalizeOpenRouterEmbeddingUsage('embed-model', {
        promptTokens: 12,
        cost: 0.01,
      }),
    ).toMatchObject({
      promptTokens: 12,
      completionTokens: 0,
      totalTokens: 12,
      reportedTotalTokens: null,
    });
  });

  it('records a divergent provider total in metadata-friendly form', () => {
    expect(
      normalizeOpenRouterEmbeddingUsage('embed-model', {
        promptTokens: 12,
        totalTokens: 18,
        cost: 0.01,
      }),
    ).toMatchObject({
      totalTokens: 12,
      reportedTotalTokens: 18,
    });
  });
});

describe('normalizeOpenRouterError', () => {
  it('maps an SDK request-timeout error to code "timeout"', () => {
    const error = normalizeOpenRouterError(
      Object.assign(new Error('Request timed out: the operation was aborted'), {
        name: 'RequestTimeoutError',
      }),
    );

    expect(error.code).toBe('timeout');
    expect(error.status).toBeUndefined();
  });

  it('maps an SDK connection error to code "connection_error"', () => {
    const error = normalizeOpenRouterError(
      Object.assign(new Error('Unable to make request'), { name: 'ConnectionError' }),
    );

    expect(error.code).toBe('connection_error');
  });

  it('prefers a provider-reported error code over the client error name', () => {
    const error = normalizeOpenRouterError(
      Object.assign(new Error('Request timed out'), {
        name: 'RequestTimeoutError',
        body: JSON.stringify({ error: { message: 'rate limited', code: 'rate_limit_exceeded' } }),
      }),
    );

    expect(error.code).toBe('rate_limit_exceeded');
  });

  it('leaves code undefined for an unrelated error name', () => {
    const error = normalizeOpenRouterError(
      Object.assign(new Error('boom'), { name: 'UnexpectedClientError' }),
    );

    expect(error.code).toBeUndefined();
  });
});
