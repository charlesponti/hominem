import { render, screen, waitFor } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { HominemSession, HominemUser } from './types'
import { AuthProvider, useAuthContext } from './client'

const initialUser: HominemUser = {
  id: 'user-1',
  email: 'user@example.com',
  isAdmin: false,
  createdAt: '2026-03-10T12:00:00.000Z',
  updatedAt: '2026-03-10T12:00:00.000Z',
}

const initialSession: HominemSession = {
  access_token: 'token-123',
  token_type: 'Bearer',
  expires_in: 600,
  expires_at: '2026-03-10T12:10:00.000Z',
}

function TestConsumer() {
  const { authClient, isAuthenticated, user } = useAuthContext()
  const [token, setToken] = useState<string>('pending')

  useEffect(() => {
    void authClient.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? 'missing')
    })
  }, [authClient])

  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'signed-out'}</div>
      <div data-testid="email">{user?.email ?? 'missing'}</div>
      <div data-testid="token">{token}</div>
    </div>
  )
}

function StateConsumer() {
  const { isAuthenticated, user, session } = useAuthContext()

  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'signed-out'}</div>
      <div data-testid="email">{user?.email ?? 'missing'}</div>
      <div data-testid="token">{session?.access_token ?? 'missing'}</div>
    </div>
  )
}

describe('AuthProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('hydrates authenticated state from the server session without a client session probe', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const onAuthEvent = vi.fn()

    render(
      <AuthProvider
        config={{ apiBaseUrl: 'http://localhost:4040' }}
        initialUser={initialUser}
        initialSession={initialSession}
        onAuthEvent={onAuthEvent}
      >
        <TestConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('email')).toHaveTextContent('user@example.com')
      expect(screen.getByTestId('token')).toHaveTextContent('token-123')
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(onAuthEvent).not.toHaveBeenCalled()
  })

  it('uses the explicit refresh route before retrying the session probe', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ isAuthenticated: false, user: null }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            accessToken: 'refreshed-token',
            refreshToken: 'refreshed-refresh',
            expiresIn: 600,
            tokenType: 'Bearer',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            isAuthenticated: true,
            user: initialUser,
            accessToken: 'refreshed-token',
            expiresIn: 600,
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    render(
      <AuthProvider config={{ apiBaseUrl: 'http://localhost:4040' }}>
        <StateConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('email')).toHaveTextContent('user@example.com')
      expect(screen.getByTestId('token')).toHaveTextContent('refreshed-token')
    })

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:4040/api/auth/session',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:4040/api/auth/refresh',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    )
    expect(fetchSpy).toHaveBeenNthCalledWith(
      3,
      'http://localhost:4040/api/auth/session',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })
})
