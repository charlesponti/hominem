import type { AppType } from '@hominem/hono-rpc';

import { hc } from 'hono/client';

import { getValidAccessToken } from '../utils/auth-utils';

const client: ReturnType<typeof hc<AppType>> = hc('http://localhost:4040', {
  fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No token found. Please run `hominem auth` to authenticate.');
    }
    const headers = new Headers(init?.headers);

    headers.set('Authorization', `Bearer ${token}`);

    try {
      const response = await fetch(input, {
        ...init,
        headers,
        credentials: 'include',
      });

      // Throw on non-OK responses so error handling works
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        const errorMessage = errorData.error || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      return response;
    } catch (error: unknown) {
      throw error;
    }
  },
}) as any;

export const trpc = {
  get api() {
    return (client as any).api;
  },
};

// For backwards compatibility
export { trpc as client };
