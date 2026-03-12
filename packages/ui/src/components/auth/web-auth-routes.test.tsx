import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createAuthEntryComponent, createAuthVerifyComponent } from './web-auth-routes'

const authenticate = vi.fn()
const usePasskeyAuthMock = vi.fn()

vi.mock('../../hooks/use-passkey-auth', () => ({
  usePasskeyAuth: (options: { redirectTo?: string }) => usePasskeyAuthMock(options),
}))

describe('web auth routes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    authenticate.mockReset()
    usePasskeyAuthMock.mockReset()
  })

  it('preserves next in the email entry form and passkey redirect target', () => {
    usePasskeyAuthMock.mockReturnValue({
      authenticate,
      error: null,
      isLoading: false,
      isSupported: true,
    })

    const Component = createAuthEntryComponent({
      title: 'Sign in',
      description: 'Continue',
      defaultRedirect: '/home',
      allowedRedirectPrefixes: ['/home', '/notes'],
    })

    const router = createMemoryRouter(
      [{ path: '/auth', element: <Component /> }],
      { initialEntries: ['/auth?next=%2Fnotes%2F123'] },
    )

    render(<RouterProvider router={router} />)

    expect(usePasskeyAuthMock).toHaveBeenCalledWith({ redirectTo: '/notes/123' })
    expect(screen.getByDisplayValue('/notes/123')).toHaveAttribute('name', 'next')
  })

  it('preserves next in the verify form and passkey fallback target', async () => {
    usePasskeyAuthMock.mockReturnValue({
      authenticate,
      error: null,
      isLoading: false,
      isSupported: true,
    })

    const Component = createAuthVerifyComponent({
      defaultRedirect: '/home',
      allowedRedirectPrefixes: ['/home', '/notes'],
    })

    const router = createMemoryRouter(
      [
        {
          path: '/auth/verify',
          loader: () => ({ email: 'user@example.com' }),
          element: <Component />,
        },
      ],
      { initialEntries: ['/auth/verify?email=user%40example.com&next=%2Fnotes%2F123'] },
    )

    render(<RouterProvider router={router} />)

    await waitFor(() => {
      expect(usePasskeyAuthMock).toHaveBeenCalledWith({ redirectTo: '/notes/123' })
    })
    expect(await screen.findByDisplayValue('/notes/123')).toHaveAttribute('name', 'next')
    expect(await screen.findByRole('button', { name: 'Use a different email' })).toBeInTheDocument()
  })
})
