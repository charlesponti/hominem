/**
 * Tests for AuthContext and useAuth hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { LocalMockAuthProvider, useAuth } from './AuthContext'
import { useSafeAuth, useAuthContext } from './client'

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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')

    consoleError.mockRestore()
  })

  it('should provide initial unauthenticated state', async () => {
    render(
      <LocalMockAuthProvider>
        <TestComponent />
      </LocalMockAuthProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated')
  })
})

describe('useSafeAuth hook', () => {
  function TestSafeAuthComponent() {
    const auth = useSafeAuth()
    return (
      <div>
        <div data-testid="auth-result">{auth ? 'has-context' : 'no-context'}</div>
        {auth && <div data-testid="user-id">{auth.userId || 'no-user'}</div>}
      </div>
    )
  }

  it('should return null when used outside AuthProvider', () => {
    render(<TestSafeAuthComponent />)
    expect(screen.getByTestId('auth-result')).toHaveTextContent('no-context')
  })

  it('should return context when used within AuthProvider', () => {
    render(
      <LocalMockAuthProvider>
        <TestSafeAuthComponent />
      </LocalMockAuthProvider>,
    )
    expect(screen.getByTestId('auth-result')).toHaveTextContent('has-context')
  })
})

describe('useAuthContext hook', () => {
  function TestAuthContextComponent() {
    const { userId } = useAuthContext()
    return <div data-testid="user-id">{userId || 'no-user'}</div>
  }

  it('should throw when used outside AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      render(<TestAuthContextComponent />)
    }).toThrow('useAuthContext must be used within an AuthProvider')
    consoleError.mockRestore()
  })

  it('should return context when used within AuthProvider', () => {
    render(
      <LocalMockAuthProvider>
        <TestAuthContextComponent />
      </LocalMockAuthProvider>,
    )
    expect(screen.getByTestId('user-id')).toHaveTextContent('no-user')
  })
})
