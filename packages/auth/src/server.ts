import { logger } from '@hominem/utils/logger'
import { getSetCookieHeaders } from '@hominem/utils/headers'

import { resolveAuthRedirect } from './redirect-policy'
import type { AuthConfig, Session, User, ServerAuthResult } from './types'

export function resolveSafeAuthRedirect(
  next: string | null | undefined,
  fallback: string,
  allowedPrefixes: string[] = [fallback]
): string {
  const resolution = resolveAuthRedirect(next, fallback, allowedPrefixes)

  if (resolution.rejectedReason === 'non_local') {
    logger.warn('[auth.redirect] rejected non-local redirect target', { next, fallback })
  } else if (resolution.rejectedReason === 'protocol_relative') {
    logger.warn('[auth.redirect] rejected protocol-relative redirect target', { next, fallback })
  } else if (resolution.rejectedReason === 'disallowed') {
    logger.warn('[auth.redirect] rejected disallowed redirect target', {
      next,
      fallback,
      pathname: resolution.rejectedPathname,
      allowedPrefixes,
    })
  }

  return resolution.safeRedirect
}

interface ServerSessionPayload {
  isAuthenticated: boolean
  user: User | null
  auth: ServerAuthResult['auth']
  accessToken?: string | null
  expiresIn?: number | null
}

function getAbsoluteApiUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString()
}

export function getAuthCookieDomain() {
  return process.env.AUTH_COOKIE_DOMAIN?.trim()
}

function appendSetCookieHeaders(target: Headers, source: Headers) {
  const setCookieValues = getSetCookieHeaders(source)
  if (setCookieValues.length > 0) {
    for (const value of setCookieValues) {
      target.append('set-cookie', value)
    }
    return
  }

  const setCookie = source.get('set-cookie')
  if (setCookie) {
    target.append('set-cookie', setCookie)
  }
}

function toSession(accessToken?: string | null, expiresIn?: number | null): Session | null {
  if (!accessToken) {
    return null
  }

  const ttl = typeof expiresIn === 'number' && expiresIn > 0 ? expiresIn : 600
  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ttl,
    expires_at: new Date(Date.now() + ttl * 1000).toISOString(),
  }
}

export async function getServerAuth(
  request: Request,
  config: AuthConfig
): Promise<ServerAuthResult & { headers: Headers }> {
  const headers = new Headers()

  try {
    const cookieHeader = request.headers.get('cookie')
    const authHeader = request.headers.get('authorization')

    const upstreamHeaders = new Headers()
    if (cookieHeader) {
      upstreamHeaders.set('cookie', cookieHeader)
    }
    if (authHeader) {
      upstreamHeaders.set('authorization', authHeader)
    }

    const res = await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/session'), {
      method: 'GET',
      headers: upstreamHeaders,
    })

    appendSetCookieHeaders(headers, res.headers)

    if (!res.ok) {
      return {
        user: null,
        session: null,
        auth: null,
        isAuthenticated: false,
        headers,
      }
    }

    const payload = (await res.json()) as ServerSessionPayload
    const session = toSession(payload.accessToken, payload.expiresIn)

    return {
      user: payload.user ?? null,
      session,
      auth: payload.auth ?? null,
      isAuthenticated: Boolean(payload.isAuthenticated && payload.user),
      headers,
    }
  } catch (error) {
    logger.error('[getServerAuth]', { error })
    return {
      user: null,
      session: null,
      auth: null,
      isAuthenticated: false,
      headers,
    }
  }
}

export function createServerAuthClient(request: Request, config: AuthConfig) {
  return {
    headers: new Headers(),
    authClient: {
      auth: {
        async getUser() {
          const headers = new Headers()
          const cookieHeader = request.headers.get('cookie')
          if (cookieHeader) {
            headers.set('cookie', cookieHeader)
          }

          const res = await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/session'), {
            method: 'GET',
            headers,
          })

          if (!res.ok) {
            return { data: { user: null }, error: new Error('Unauthorized') }
          }

          const payload = (await res.json()) as ServerSessionPayload
          return { data: { user: payload.user }, error: null }
        },
      },
    },
  }
}
