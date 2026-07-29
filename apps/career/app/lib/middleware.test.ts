// @vitest-environment node

import type { User } from '@ponti-studios/auth/types';
import type { PortfolioRecord } from '@hominem/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const ensureUserPortfolio = vi.fn();
const getServerSession = vi.fn();

vi.mock('./portfolio.server', () => ({
  ensureUserPortfolio,
}));

vi.mock('./auth.server', () => ({
  getServerSession,
}));

const testUser = {
  id: 'auth-user-id',
  email: 'user@example.com',
  emailVerified: true,
  name: 'Test User',
  image: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} satisfies User;

const testPortfolio = {
  id: 'portfolio-id',
  ownerUserid: testUser.id,
  title: 'Portfolio',
  slug: 'portfolio',
} satisfies Partial<PortfolioRecord> as PortfolioRecord;

function createRequestContext() {
  const values = new Map<unknown, unknown>();
  return {
    context: {
      get: (key: unknown) => values.get(key),
      set: (key: unknown, value: unknown) => values.set(key, value),
    },
    values,
  };
}

const next = () => Promise.resolve(new Response());

describe('career middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureUserPortfolio.mockResolvedValue(testPortfolio);
  });

  it('hydrates user context when a session exists', async () => {
    const { sessionMiddleware, userContext } = await import('./middleware');
    const requestContext = createRequestContext();
    getServerSession.mockResolvedValue({ user: testUser, headers: new Headers() });

    const result = await sessionMiddleware(
      {
        request: new Request('http://localhost/auth'),
        context: requestContext.context,
      } as never,
      next,
    );

    expect(result).toBeInstanceOf(Response);
    expect(requestContext.values.get(userContext)).toBe(testUser);
  });

  it('redirects page requests when auth is required and no session exists', async () => {
    const { requireAuthMiddleware } = await import('./middleware');

    const result = await requireAuthMiddleware(
      {
        request: new Request('http://localhost/account'),
        context: createRequestContext().context,
      } as never,
      next,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('location')).toBe('/auth?next=%2Faccount');
  });

  it('returns 401 for authenticated api requests without a session', async () => {
    const { requireAuthMiddleware } = await import('./middleware');

    const result = await requireAuthMiddleware(
      {
        request: new Request('http://localhost/api/resume/convert'),
        context: createRequestContext().context,
      } as never,
      next,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it('ensures a portfolio for authenticated page routes', async () => {
    const { loadPortfolioMiddleware, portfolioContext, userContext } = await import('./middleware');
    const requestContext = createRequestContext();
    requestContext.context.set(userContext, testUser);

    const request = new Request('http://localhost/account');
    await loadPortfolioMiddleware(
      {
        request,
        context: requestContext.context,
      } as never,
      next,
    );

    expect(ensureUserPortfolio).toHaveBeenCalledWith(request, testUser);
    expect(requestContext.values.get(portfolioContext)).toBe(testPortfolio);
  });

  it('redirects portfolio-required routes when portfolio context is missing', async () => {
    const { requirePortfolioMiddleware, userContext } = await import('./middleware');
    const requestContext = createRequestContext();
    requestContext.context.set(userContext, testUser);

    const result = await requirePortfolioMiddleware(
      {
        request: new Request('http://localhost/work'),
        context: requestContext.context,
      } as never,
      next,
    );

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).headers.get('location')).toBe('/work');
  });
});
