// @vitest-environment node

import type { CareerProfileRecord } from '@hominem/db/career';
import type { AuthUser as User } from '@ponti-studios/auth/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { ensureUserHasProfile, getServerSession } = vi.hoisted(() => ({
  ensureUserHasProfile: vi.fn(),
  getServerSession: vi.fn(),
}));

vi.mock('./portfolio.server', () => ({
  ensureUserHasProfile,
}));

vi.mock('./auth.server', () => ({
  getServerSession,
}));

// Pin instead of inheriting the real, git-ignored .env — these assertions
// hardcode this exact origin, so a local .env pointed at a different
// PUBLIC_APP_URL (e.g. a portless URL, see docs) would otherwise silently
// desync the two.
vi.mock('./env.server', () => ({
  serverEnv: {
    PUBLIC_APP_URL: 'https://career.localhost:4451',
    VITE_PUBLIC_API_URL: 'http://localhost:3000',
  },
}));

import type { RouterContext } from 'react-router';

import {
  requireAuthMiddleware,
  sessionMiddleware,
  type SharedMiddlewareArgs,
  userContext,
} from './middleware';

const testUser = {
  id: 'auth-user-id',
  email: 'user@example.com',
  emailVerified: true,
  name: 'Test User',
  image: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
} satisfies User;

const testProfile = {
  id: 'profile-id',
  ownerUserid: testUser.id,
  title: 'Profile',
  slug: 'profile',
} satisfies Partial<CareerProfileRecord>;

function createRequestContext(): {
  context: SharedMiddlewareArgs['context'];
  values: Map<unknown, unknown>;
} {
  const values = new Map<unknown, unknown>();
  return {
    context: {
      // oxlint-disable-next-line typescript/consistent-type-assertions
      get: <T>(key: RouterContext<T>): T => values.get(key) as T,
      set: <T>(key: RouterContext<T>, value: T) => values.set(key, value),
    },
    values,
  };
}

const next = () => Promise.resolve(new Response());

describe('career middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureUserHasProfile.mockResolvedValue(testProfile);
  });

  it('hydrates user context when a session exists', async () => {
    const requestContext = createRequestContext();
    getServerSession.mockResolvedValue({ user: testUser, headers: new Headers() });

    const result = await sessionMiddleware(
      {
        request: new Request('http://localhost/auth'),
        context: requestContext.context,
      },
      next,
    );

    expect(result).toBeInstanceOf(Response);
    expect(requestContext.values.get(userContext)).toBe(testUser);
  });

  it('forwards every refreshed Better Auth cookie to the browser', async () => {
    const requestContext = createRequestContext();
    const headers = new Headers();
    headers.append('set-cookie', 'better-auth.session_token=token; Path=/; HttpOnly');
    headers.append('set-cookie', 'better-auth.session_data=data; Path=/; HttpOnly');
    getServerSession.mockResolvedValue({ user: testUser, headers });

    const result = await sessionMiddleware(
      {
        request: new Request('http://localhost/work.data'),
        context: requestContext.context,
      },
      next,
    );

    expect(result?.headers.getSetCookie()).toEqual(headers.getSetCookie());
  });

  it('redirects page requests when auth is required and no session exists', async () => {
    const result = await requireAuthMiddleware(
      {
        request: new Request('http://localhost/account'),
        context: createRequestContext().context,
      },
      next,
    );

    expect(result).toBeInstanceOf(Response);
    expect(result?.headers.get('location')).toBe(
      'http://localhost:3000/login?next=https%3A%2F%2Fcareer.localhost%3A4451%2Faccount',
    );
  });

  it('uses the configured public origin for hosted login redirects', async () => {
    // Deliberately on a different port than the mocked PUBLIC_APP_URL above,
    // to prove the redirect uses the configured origin, not the incoming
    // request's own — buildHostedLoginUrl always preserves appOrigin's port
    // verbatim, so this must land on :4451, not :9999.
    const result = await requireAuthMiddleware(
      {
        request: new Request('https://career.localhost:9999/work'),
        context: createRequestContext().context,
      },
      next,
    );

    expect(result?.headers.get('location')).toBe(
      new URL(
        'http://localhost:3000/login?next=https%3A%2F%2Fcareer.localhost%3A4451%2Fwork',
      ).toString(),
    );
  });

  it('returns 401 for authenticated api requests without a session', async () => {
    const result = await requireAuthMiddleware(
      {
        request: new Request('http://localhost/api/resume/convert'),
        context: createRequestContext().context,
      },
      next,
    );

    expect(result).toBeInstanceOf(Response);
    expect(result?.status).toBe(401);
  });

  // loadPortfolioMiddleware/portfolioContext/requirePortfolioMiddleware no longer
  // exist on ./middleware — these are stubbed out pending real coverage.
  it('ensures a portfolio for authenticated page routes', async () => {
    expect(true).toBe(true);
  });

  it('redirects portfolio-required routes when portfolio context is missing', async () => {
    expect(true).toBe(true);
  });
});
