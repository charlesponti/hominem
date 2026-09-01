function normalizeRedirectPrefix(prefix: string) {
  const normalized = new URL(prefix, 'http://localhost').pathname;
  return normalized.endsWith('/') && normalized !== '/' ? normalized.slice(0, -1) : normalized;
}

function isAllowedRedirectPath(pathname: string, allowedPrefixes: readonly string[]) {
  for (const prefix of allowedPrefixes) {
    const normalizedPrefix = normalizeRedirectPrefix(prefix);
    if (pathname === normalizedPrefix) return true;
    if (normalizedPrefix !== '/' && pathname.startsWith(`${normalizedPrefix}/`)) return true;
  }
  return false;
}

type AuthRedirectResolution = {
  safeRedirect: string;
  rejectedReason: 'missing' | 'non_local' | 'protocol_relative' | 'disallowed' | null;
  rejectedPathname: string | null;
};

function getRejectedReason(next?: string) {
  if (!next || next.length === 0) {
    return 'missing';
  }
  if (!next.startsWith('/')) {
    return 'non_local';
  }
  if (next.startsWith('//')) {
    return 'protocol_relative';
  }
  return null;
}

export function resolveAuthRedirect(
  next: string | null | undefined,
  fallback: string,
  allowedPrefixes: readonly string[] = [fallback],
): AuthRedirectResolution {
  const rejectedReason = getRejectedReason(next ?? undefined);

  if (rejectedReason) {
    return {
      safeRedirect: fallback,
      rejectedReason,
      rejectedPathname: null,
    };
  }

  const url = new URL(next!, 'http://localhost');
  if (!isAllowedRedirectPath(url.pathname, allowedPrefixes)) {
    return {
      safeRedirect: fallback,
      rejectedReason: 'disallowed',
      rejectedPathname: url.pathname,
    };
  }

  return {
    safeRedirect: `${url.pathname}${url.search}${url.hash}`,
    rejectedReason: null,
    rejectedPathname: null,
  };
}

// Builds the URL to resume Better Auth's MCP/OIDC authorize flow after
// login. That flow redirects unauthenticated requests to our `loginPage`
// with the original authorize query string attached. After login, the
// browser needs to go back to that same authorize endpoint (same query
// string) on the API's own origin so the new session cookie actually gets
// sent — a normal in-app redirect can't do that since it's a different
// origin.
//
// Not an open-redirect risk: the host+path is always
// `${apiBaseUrl}/api/auth/oauth2/authorize`, a trusted config value, never
// taken from the query string. Only the query string itself gets forwarded.
export function resolveOAuthResumeUrl(search: string, apiBaseUrl: string): string | null {
  const params = new URLSearchParams(search);
  const responseType = params.get('response_type');
  const clientId = params.get('client_id');
  const redirectUri = params.get('redirect_uri');

  if (responseType !== 'code' || !clientId || !redirectUri) {
    return null;
  }

  const url = new URL('/api/auth/oauth2/authorize', apiBaseUrl);
  url.search = search;
  return url.toString();
}

// For apps that don't have their own login UI and send users to the shared
// hosted `/login` page with `?next=<absolute-url>` instead (see
// services/api/src/routes/login.tsx's "app redirect" mode). Unlike
// resolveAuthRedirect, which only allows same-origin relative paths, `next`
// here has to be a cross-origin absolute URL since it's pointing at a
// different app entirely — so the allowlist of trusted origins is the only
// thing preventing an open redirect. Only the origin gets checked; path,
// query, and hash pass through once it clears the allowlist.
export function resolveAppRedirectUrl(
  next: string | null | undefined,
  allowedOrigins: readonly string[],
): string | null {
  if (!next) return null;

  let url: URL;
  try {
    url = new URL(next);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (!allowedOrigins.includes(url.origin)) return null;

  return url.toString();
}

export function buildHostedLoginUrl(input: {
  apiBaseUrl: string;
  appOrigin: string;
  next: string | null | undefined;
  fallback: string;
  allowedPrefixes: readonly string[];
}): string {
  const { safeRedirect } = resolveAuthRedirect(input.next, input.fallback, input.allowedPrefixes);
  const returnUrl = new URL(safeRedirect, input.appOrigin);
  const loginUrl = new URL('/login', input.apiBaseUrl);
  loginUrl.searchParams.set('next', returnUrl.toString());
  return loginUrl.toString();
}
