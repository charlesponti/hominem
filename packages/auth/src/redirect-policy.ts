function normalizeRedirectPrefix(prefix: string) {
  const normalized = new URL(prefix, 'https://hominem.local').pathname
  return normalized.endsWith('/') && normalized !== '/' ? normalized.slice(0, -1) : normalized
}

function isAllowedRedirectPath(pathname: string, allowedPrefixes: string[]) {
  for (const prefix of allowedPrefixes) {
    const normalizedPrefix = normalizeRedirectPrefix(prefix)
    if (pathname === normalizedPrefix) {
      return true
    }
    if (normalizedPrefix !== '/' && pathname.startsWith(`${normalizedPrefix}/`)) {
      return true
    }
  }
  return false
}

export interface AuthRedirectResolution {
  safeRedirect: string
  rejectedReason: 'missing' | 'non_local' | 'protocol_relative' | 'disallowed' | null
  rejectedPathname: string | null
}

export function resolveAuthRedirect(
  next: string | null | undefined,
  fallback: string,
  allowedPrefixes: string[] = [fallback]
): AuthRedirectResolution {
  if (!next || next.length === 0) {
    return {
      safeRedirect: fallback,
      rejectedReason: 'missing',
      rejectedPathname: null,
    }
  }

  if (!next.startsWith('/')) {
    return {
      safeRedirect: fallback,
      rejectedReason: 'non_local',
      rejectedPathname: null,
    }
  }

  if (next.startsWith('//')) {
    return {
      safeRedirect: fallback,
      rejectedReason: 'protocol_relative',
      rejectedPathname: null,
    }
  }

  const url = new URL(next, 'https://hominem.local')
  if (!isAllowedRedirectPath(url.pathname, allowedPrefixes)) {
    return {
      safeRedirect: fallback,
      rejectedReason: 'disallowed',
      rejectedPathname: url.pathname,
    }
  }

  return {
    safeRedirect: `${url.pathname}${url.search}${url.hash}`,
    rejectedReason: null,
    rejectedPathname: null,
  }
}
