import { screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, test } from 'vitest'

import Login from '../routes/Login.svelte'
import { renderWithStores, mockNavigate, setupAuth } from './utils'

describe('Login', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
  })

  test('redirects to dashboard when user is already authenticated', () => {
    // Setup authenticated state
    setupAuth(true)

    renderWithStores(Login, { isAuth: true })

    // Verify navigation was called with the dashboard path
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  test('renders the login form when not authenticated', () => {
    // Setup unauthenticated state
    setupAuth(false)

    renderWithStores(Login)

    // Check for sign in text
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument()
  })
})
