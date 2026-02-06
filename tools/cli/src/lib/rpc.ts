import type { AppType } from '@hominem/hono-rpc';

import { hc } from 'hono/client';

import { getAccessToken } from '../utils/auth';

// Create the typed Hono RPC client
// Type is inferred directly from hc<AppType>
export const rpc = hc<AppType>('http://localhost:4040', {
  fetch: async (input: string | URL, init?: RequestInit) => {
    const attempt = async (refresh = false) => {
      const token = await getAccessToken(refresh);
      if (!token) {
        throw new Error('No token found. Please run `hominem auth login` to authenticate.');
      }

      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${token}`);

      const response = await fetch(input, {
        ...init,
        headers,
        credentials: 'include',
      });
      return response;
    };

    let response = await attempt(false);

    if (response.status === 401) {
      response = await attempt(true);
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({ error: 'Request failed' }))) as {
        error?: string;
      };
      const errorMessage = errorData.error || `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return response;
  },
});

// Legacy alias for backward compatibility
export const honoClient = rpc;
