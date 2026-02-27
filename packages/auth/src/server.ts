import { logger } from '@hominem/utils/logger'

import type { AuthConfig, HominemSession, HominemUser, ServerAuthResult } from './types'

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
    return {
      user: payload.user ?? null,
      session: toSession(payload.accessToken, payload.expiresIn),
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

export function createServerAuthClient(_request: Request, config: AuthConfig) {
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
