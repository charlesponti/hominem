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
})
