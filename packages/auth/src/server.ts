import { logger } from '@hominem/utils/logger'
import { getSetCookieHeaders } from '@hominem/utils/headers'

import { resolveAuthRedirect } from './redirect-policy'
import type { AuthConfig, HominemSession, HominemUser, ServerAuthResult } from './types'

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
  user: HominemUser | null
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

function getRequestAccessToken(request: Request) {
  const authorization = request.headers.get('authorization')
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7)
  }

  const cookieHeader = request.headers.get('cookie') ?? ''
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)hominem_access_token=([^;]+)/)
  const tokenValue = tokenMatch?.[1]
  if (!tokenValue) {
    return null
  }

  try {
    return decodeURIComponent(tokenValue)
  } catch {
    return tokenValue
  }
}

function getRequestRefreshToken(request: Request) {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)hominem_refresh_token=([^;]+)/)
  const tokenValue = tokenMatch?.[1]
  if (!tokenValue) {
    return null
  }

  try {
    return decodeURIComponent(tokenValue)
  } catch {
    return tokenValue
  }
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

function toSession(accessToken?: string | null, expiresIn?: number | null): HominemSession | null {
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
  const requestAccessToken = getRequestAccessToken(request)
  const requestRefreshToken = getRequestRefreshToken(request)

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

    let sessionResponse = res
    if (res.status === 401 && !authHeader && requestRefreshToken) {
      const refreshHeaders = new Headers()
      if (cookieHeader) {
        refreshHeaders.set('cookie', cookieHeader)
      }

      const refreshRes = await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/refresh'), {
        method: 'POST',
        headers: refreshHeaders,
      })

      appendSetCookieHeaders(headers, refreshRes.headers)

      if (refreshRes.ok) {
        const refreshPayload = (await refreshRes.json()) as {
          accessToken?: string | null
        }

        if (refreshPayload.accessToken) {
          sessionResponse = await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/session'), {
            method: 'GET',
            headers: new Headers({
              authorization: `Bearer ${refreshPayload.accessToken}`,
            }),
          })
          appendSetCookieHeaders(headers, sessionResponse.headers)
        } else {
          sessionResponse = refreshRes
        }
      } else {
        sessionResponse = refreshRes
      }
    }

    if (!sessionResponse.ok) {
      return {
        user: null,
        session: null,
        auth: null,
        isAuthenticated: false,
        headers,
      }
    }

    const payload = (await sessionResponse.json()) as ServerSessionPayload
    const session = toSession(payload.accessToken ?? requestAccessToken, payload.expiresIn)

    return {
      user: payload.user ?? null,
      session,
      auth: payload.auth ?? null,
      isAuthenticated: Boolean(payload.isAuthenticated && payload.user && session),
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
  void request
  return {
    headers: new Headers(),
    authClient: {
      auth: {
        async getUser() {
          const res = await fetch(getAbsoluteApiUrl(config.apiBaseUrl, '/api/auth/session'), {
            method: 'GET',
            credentials: 'include',
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
