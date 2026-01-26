import type { AppType } from '@hominem/hono-rpc';
import { hc } from 'hono/client';

import { getValidAccessToken } from '../utils/auth-utils';

export const client = hc<AppType>('http://localhost:4040', {
  headers: async () => {
    const token = await getValidAccessToken();
    if (!token) {
      throw new Error('No token found. Please run `hominem auth` to authenticate.');
    }
    return {
      authorization: token ? `Bearer ${token}` : '',
    };
  },
});

// For backwards compatibility, export as trpc
export const trpc = client;
