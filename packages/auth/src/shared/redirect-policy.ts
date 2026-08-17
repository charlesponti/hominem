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

/**
 * Resolves a resume URL for Better Auth's MCP/OIDC authorize flow, which
 * redirects unauthenticated requests to a configured `loginPage` with the
 * original authorize query string attached (see
 * Better Auth's OAuth 2.1 authorize endpoint. After login, the browser must
 * navigate back to that same authorize endpoint (same query string) on the
 * API's own origin so the newly-established session cookie is sent and the
 * flow can resume — a plain in-app redirect can't do this since it's a
 * different origin.
 *
 * This is not an open-redirect risk: the destination host+path is always
 * `${apiBaseUrl}/api/auth/oauth2/authorize`, a trusted config value never taken
 * from the query string. Only the query string itself is forwarded verbatim.
 */
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

/**
 * Resolves a post-login redirect target for apps that don't host their own
 * login UI and instead send users to the shared hosted `/login` page with
 * `?next=<absolute-url>` (see services/api/src/routes/login.tsx's "app
 * redirect" mode). Unlike resolveAuthRedirect (same-origin relative paths
 * only), `next` here is a cross-origin absolute URL by necessity — the
 * destination is a different app's origin entirely — so the allowlist of
 * trusted app origins is the only thing standing between this and an open
 * redirect. Only `next`'s origin is checked; the path/query/hash are
 * forwarded as-is once the origin clears the allowlist.
 */
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
