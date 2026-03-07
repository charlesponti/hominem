export interface SessionState {
  isAuthenticated: boolean
  user: {
    id: string
    email: string
  } | null
  auth: {
    sub: string
    sid: string
    scope: string[]
    role: 'user' | 'admin'
    amr: string[]
    authTime: number
  } | null
}

export async function fetchSessionState(input: {
  apiBaseUrl: string
  cookieHeader?: string | undefined
}): Promise<SessionState> {
  const url = new URL('/api/auth/session', input.apiBaseUrl)
  const headers = new Headers()
  if (input.cookieHeader) {
    headers.set('cookie', input.cookieHeader)
  }
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  })
  if (!response.ok) {
    throw new Error(`failed_to_fetch_session_state:${response.status}`)
  }
  return (await response.json()) as SessionState
}

export function expectAuthenticated(state: SessionState) {
  if (!state.isAuthenticated || !state.user || !state.auth) {
    throw new Error('expected_authenticated_session')
  }
}

export function expectUnauthenticated(state: SessionState) {
  if (state.isAuthenticated || state.user || state.auth) {
    throw new Error('expected_unauthenticated_session')
  }
}
