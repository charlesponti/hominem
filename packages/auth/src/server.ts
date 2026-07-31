import type { AuthUser } from './types.js';

interface AuthConfig {
  apiBaseUrl: string;
}

interface BetterAuthGetSessionPayload {
  session: { id: string } | null;
  user: AuthUser | null;
}

export async function getServerAuth(request: Request, config: AuthConfig) {
  const headers = new Headers();
  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.set('cookie', cookie);
  }

  const response = await fetch(new URL('/api/auth/get-session', config.apiBaseUrl).toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    return { user: null, headers: new Headers() };
  }

  const payload = (await response.json().catch(() => null)) as BetterAuthGetSessionPayload | null;
  return {
    user: payload?.session ? (payload.user ?? null) : null,
    headers: new Headers(),
  };
}
