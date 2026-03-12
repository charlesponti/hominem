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
      expect(screen.getByTestId('authenticated').textContent).toBe('authenticated')
      expect(screen.getByTestId('email').textContent).toBe('user@example.com')
      expect(screen.getByTestId('token').textContent).toBe('token-123')
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(onAuthEvent).not.toHaveBeenCalled()
  })

  it('treats a 401 session probe as signed out without calling the refresh route', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ isAuthenticated: false, user: null }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        }),
      )

    render(
      <AuthProvider config={{ apiBaseUrl: 'http://localhost:4040' }}>
        <StateConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('signed-out')
      expect(screen.getByTestId('email').textContent).toBe('missing')
      expect(screen.getByTestId('token').textContent).toBe('missing')
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:4040/api/auth/session',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })
})
