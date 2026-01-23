import type { UserSelect } from '@hominem/db/schema';
import type { Hono } from 'hono';

import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import type { AppEnv } from '../src/server';

/**
 * Generic helper to create a tRPC test client
 * Avoids inline type expansion by using a generic Router type
 */
const createTestClientWithFetch = (
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
) => {
  return createTRPCProxyClient<any>({
    links: [
      httpBatchLink({
        url: 'http://localhost/trpc',
        fetch,
      }),
    ],
  });
};

/**
 * Creates a tRPC test client that works with the existing test infrastructure
 * Uses x-user-id header for authentication in test mode
 */
export const createTRPCTestClient = (server: Hono<AppEnv>, userId: string) => {
  return createTestClientWithFetch(async (input, init) => {
    // Create a mock request to the server
    const request = new Request(input, {
      ...init,
      headers: {
        ...init?.headers,
        'x-user-id': userId,
        // Don't set authorization header - let the test middleware handle auth
      },
    });

    return server.fetch(request);
  });
};

/**
 * Creates a tRPC test client with custom context
 */
export const createTRPCTestClientWithContext = (
  server: Hono<AppEnv>,
  context: { userId: string; user?: UserSelect },
) => {
  return createTestClientWithFetch(async (input, init) => {
    const request = new Request(input, {
      ...init,
      headers: {
        ...init?.headers,
        'x-user-id': context.userId,
      },
    });

    return server.fetch(request);
  });
};
