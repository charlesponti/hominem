import type { AuthState } from './types'

export type AuthStatusCompat = AuthState['status']

interface SessionTokenShape {
  session?: {
    accessToken?: string
    token?: string
  } | null
}

export function mapAuthStatus(status: AuthState['status']): AuthStatusCompat {
  return status
}

export function resolveIsLoadingAuth(state: AuthState): boolean {
  return state.isLoading || state.status === 'booting'
}

export function extractSessionAccessToken(session: SessionTokenShape | null): string | null {
  const accessToken = session?.session?.accessToken
  if (typeof accessToken === 'string' && accessToken.length > 0) {
    return accessToken
  }

  const token = session?.session?.token
  if (typeof token === 'string' && token.length > 0) {
    return token
  }

  return null
}
