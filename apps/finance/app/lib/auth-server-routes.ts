/**
 * Server-side auth route factory shims.
 * Owns Finance's auth server routes; UI packages do not participate in this boundary.
 */
import { redirect, data } from 'react-router';

interface AuthConfig {
  allowedRedirectPrefixes?: readonly string[] | string[];
  defaultRedirect?: string;
  title?: string;
  description?: string;
}

interface ServerRouteConfig extends AuthConfig {
  getApiBaseUrl: () => string;
}

type GetServerAuthFn = (request: Request) => Promise<{
  user: { id: string; email: string; name?: string | null } | null;
  headers: Headers;
}>;

function isAllowedRedirect(href: string, allowedPrefixes: readonly string[] | string[]) {
  try {
    const url = new URL(href, 'http://localhost');
    return allowedPrefixes.some((p) => url.pathname.startsWith(p));
  } catch {
    return false;
  }
}

function getFormDataString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

export function copySetCookieHeaders(source: Headers) {
  const headers = new Headers();
  for (const setCookie of source.getSetCookie()) headers.append('set-cookie', setCookie);
  return headers;
}

// ── Entry (email OTP request) ─────────────────────────────────────────────────
export function createAuthEntryLoader(config: AuthConfig, getServerAuth: GetServerAuthFn) {
  return async ({ request }: { request: Request }) => {
    const { user, headers } = await getServerAuth(request);
    if (user) {
      return redirect(config.defaultRedirect ?? '/', { headers });
    }
    return data({ user: null });
  };
}

export function createAuthEntryAction(config: ServerRouteConfig) {
  return async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    const email = getFormDataString(formData, 'email');

    const apiBaseUrl = config.getApiBaseUrl();
    const res = await fetch(
      new URL('/api/auth/email-otp/send-verification-otp', apiBaseUrl).toString(),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', origin: apiBaseUrl },
        body: JSON.stringify({ email, type: 'sign-in' }),
      },
    );

    if (!res.ok) {
      return data({ error: 'Failed to send verification email' }, { status: 400 });
    }

    // Forward any session cookies set by the auth server back to the browser
    return redirect(`/auth/verify?email=${encodeURIComponent(email)}`, {
      headers: copySetCookieHeaders(res.headers),
    });
  };
}

// ── Verify (OTP code) ─────────────────────────────────────────────────────────
export function createAuthVerifyLoader(config: AuthConfig, getServerAuth: GetServerAuthFn) {
  return async ({ request }: { request: Request }) => {
    const { user, headers } = await getServerAuth(request);
    if (user) {
      return redirect(config.defaultRedirect ?? '/', { headers });
    }
    const url = new URL(request.url);
    return data({ email: url.searchParams.get('email') ?? '' });
  };
}

export function createAuthVerifyAction(config: ServerRouteConfig) {
  return async ({ request }: { request: Request }) => {
    const formData = await request.formData();
    const reqUrl = new URL(request.url);
    const email = getFormDataString(formData, 'email') || reqUrl.searchParams.get('email') || '';
    const otp = getFormDataString(formData, 'otp');

    const apiBaseUrl = config.getApiBaseUrl();
    const res = await fetch(new URL('/api/auth/sign-in/email-otp', apiBaseUrl).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') ?? '',
        origin: apiBaseUrl,
      },
      body: JSON.stringify({ email, otp }),
    });

    if (!res.ok) {
      return data({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const url = new URL(request.url);
    const next = url.searchParams.get('redirect');
    const dest =
      next && isAllowedRedirect(next, config.allowedRedirectPrefixes ?? [])
        ? next
        : (config.defaultRedirect ?? '/');

    return redirect(dest, { headers: copySetCookieHeaders(res.headers) });
  };
}

// ── Logout ────────────────────────────────────────────────────────────────────
export function createAuthLogoutRoute(config: ServerRouteConfig) {
  const handler = async ({ request }: { request: Request }) => {
    const res = await fetch(new URL('/api/auth/logout', config.getApiBaseUrl()).toString(), {
      method: 'POST',
      headers: {
        cookie: request.headers.get('cookie') ?? '',
        'Content-Type': 'application/json',
      },
    });

    // Forward set-cookie from sign-out response to clear the session cookie
    return redirect('/auth', { headers: copySetCookieHeaders(res.headers) });
  };
  return { action: handler, loader: handler };
}
