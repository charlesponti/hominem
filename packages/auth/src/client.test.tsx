import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function IdentityOnlyConsumer() {
  const { isAuthenticated, user, session, authClient } = useAuthContext()
  const [sessionValue, setSessionValue] = useState<string>('pending')

  useEffect(() => {
    void authClient.auth.getSession().then(({ data }) => {
      setSessionValue(data.session?.access_token ?? 'missing')
    })
  }, [authClient])

  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'signed-out'}</div>
      <div data-testid="email">{user?.email ?? 'missing'}</div>
      <div data-testid="session">{session?.access_token ?? 'missing'}</div>
      <div data-testid="session-client">{sessionValue}</div>
    </div>
  )
}

function SignOutConsumer() {
  const { authClient, isAuthenticated } = useAuthContext()
  const [result, setResult] = useState('idle')

  return (
    <div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'signed-out'}</div>
      <div data-testid="signout-result">{result}</div>
      <button
        onClick={() => {
          void authClient.auth.signOut().then(({ error }) => {
            setResult(error ? error.message : 'success')
          })
        }}
        type="button"
      >
        Sign out
      </button>
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

  it('restores authenticated state from an identity-only session probe', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockImplementation(async () =>
      new Response(
        JSON.stringify({
          isAuthenticated: true,
          user: initialUser,
          auth: {
            sub: initialUser.id,
            sid: 'session-1',
            scope: ['api:read'],
            role: 'user',
            amr: ['better-auth-session'],
            authTime: 1,
          },
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        },
      ),
    )

    render(
      <AuthProvider config={{ apiBaseUrl: 'http://localhost:4040' }}>
        <IdentityOnlyConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('authenticated')
      expect(screen.getByTestId('email').textContent).toBe('user@example.com')
      expect(screen.getByTestId('session').textContent).toBe('missing')
      expect(screen.getByTestId('session-client').textContent).toBe('missing')
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:4040/api/auth/session',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('keeps the user signed in when logout invalidation fails', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'upstream_failed' }), {
        status: 503,
        headers: { 'content-type': 'application/json' },
      }),
    )

    render(
      <AuthProvider
        config={{ apiBaseUrl: 'http://localhost:4040' }}
        initialUser={initialUser}
        initialSession={initialSession}
      >
        <SignOutConsumer />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('authenticated')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('authenticated')
      expect(screen.getByTestId('signout-result').textContent).toContain('Failed to sign out')
    })
  })
})
