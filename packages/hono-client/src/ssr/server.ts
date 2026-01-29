import type { AppType } from '@hominem/hono-rpc';

import { hc } from 'hono/client';

export type HonoClient = ReturnType<typeof hc<AppType>>;
export type HonoApi = HonoClient['api'];

/**
 * Create a server-side caller for use in Remix loaders
 * Makes internal HTTP calls to Hono API with auth forwarding
 *
 * @example
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   const api = createServerCaller(request);
 *   const response = await api.finance.transactions.list.$post({
 *     json: { limit: 10 },
 *   });
 *   const data = await response.json();
 *   return json(data);
 * }
 */
export function createServerCaller(request: Request): HonoApi {
  const authToken = request.headers.get('Authorization');
  const apiUrl =
    process.env.INTERNAL_API_URL || process.env.VITE_PUBLIC_API_URL || 'http://localhost:3000';

  const client = hc<AppType>(apiUrl, {
    headers: {
      ...(authToken && { Authorization: authToken }),
      'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
      'user-agent': request.headers.get('user-agent') || '',
    },
  }) as HonoClient;

  return client.api;
}

/**
 * Alternative: Create a server caller with explicit token
 * Useful when token is stored in session/cookie
 *
 * @example
 * const token = await getTokenFromSession(request);
 * const api = createServerCallerWithToken(token);
 */
export function createServerCallerWithToken(token: string | null): HonoApi {
  const apiUrl =
    process.env.INTERNAL_API_URL || process.env.VITE_PUBLIC_API_URL || 'http://localhost:3000';

  const client = hc<AppType>(apiUrl, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  }) as HonoClient;

  return client.api;
}
