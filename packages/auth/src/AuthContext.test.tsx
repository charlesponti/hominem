/**
 * Tests for AuthContext and useAuth hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '../AuthContext'
import { DEFAULT_MOCK_USER } from '../mock-users'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Test component that uses the hook
function TestComponent() {
  const { user, isAuthenticated, isLoading, signIn, signOut } = useAuth()

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
      {user && <div data-testid="user-email">{user.email}</div>}
      <button onClick={signIn} data-testid="sign-in-btn">
        Sign In
      </button>
      <button onClick={signOut} data-testid="sign-out-btn">
        Sign Out
      </button>
    </div>
  )
}

describe('AuthContext and useAuth', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleError.mockRestore()
  })

  it('should provide initial unauthenticated state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
  })

  it('should sign in user', async () => {
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    const signInBtn = screen.getByTestId('sign-in-btn')
    await user.click(signInBtn)

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    expect(screen.getByTestId('user-email')).toHaveTextContent(DEFAULT_MOCK_USER.email)
  })

  it('should sign out user', async () => {
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    // Sign in first
    await user.click(screen.getByTestId('sign-in-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    // Then sign out
    await user.click(screen.getByTestId('sign-out-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
    })
  })

  it('should persist session in localStorage', async () => {
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    // Sign in
    await user.click(screen.getByTestId('sign-in-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    })

    // Check localStorage
    const storedSession = localStorage.getItem('hominem_auth_session')
    expect(storedSession).toBeTruthy()

    const parsed = JSON.parse(storedSession!)
    expect(parsed.user).toBeDefined()
    expect(parsed.session).toBeDefined()
  })

  it('should restore session from localStorage on mount', async () => {
    const sessionData = {
      user: DEFAULT_MOCK_USER,
      session: {
        access_token: 'mock_test_token',
        token_type: 'Bearer' as const,
        expires_in: 86400,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      },
    }

    localStorage.setItem('hominem_auth_session', JSON.stringify(sessionData))

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated')
    expect(screen.getByTestId('user-email')).toHaveTextContent(DEFAULT_MOCK_USER.email)
  })
})
