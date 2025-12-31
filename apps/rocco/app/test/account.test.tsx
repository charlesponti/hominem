import { screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import Account from '~/routes/account'
import { getMockUser } from '~/test/mocks/index'
import { mockTrpcClient, renderWithRouter } from '~/test/utils'

// Create a mock user
const MOCK_USER = getMockUser()

// Mock loader data that will be customized by each test
let mockLoaderData = { user: MOCK_USER }

// Mock React Router's useLoaderData hook for this specific test
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useLoaderData: () => mockLoaderData,
    useRouteLoaderData: (routeId: string) => {
      if (routeId === 'routes/layout') {
        return {
          user: mockLoaderData.user,
          isAuthenticated: true,
        }
      }
      return null
    },
  }
})

describe('Account', () => {
  test('renders account page with user information', async () => {
    // For this specific test, create a mock user with no avatar
    // The component expects a transformed HominemUser structure
    mockLoaderData = {
      user: {
        id: MOCK_USER.id,
        email: MOCK_USER.email || '',
        name: MOCK_USER.user_metadata?.name || MOCK_USER.user_metadata?.full_name,
        image: undefined, // No avatar
        supabaseId: MOCK_USER.id,
        isAdmin: false,
        createdAt: MOCK_USER.created_at || new Date().toISOString(),
        updatedAt: MOCK_USER.updated_at || MOCK_USER.created_at || new Date().toISOString(),
      },
    }

    // Mock delete account mutation
    const mockDeleteMutation = {
      mutate: vi.fn() as (...args: unknown[]) => unknown,
      isPending: false,
      isLoading: false,
      isError: false,
      error: null as null | { message: string },
    }
    mockTrpcClient.user.deleteAccount.useMutation.mockReturnValue(
      mockDeleteMutation as unknown as ReturnType<
        typeof mockTrpcClient.user.deleteAccount.useMutation
      >
    )

    renderWithRouter({
      routes: [
        {
          path: '/account',
          Component: Account as any,
          loader: () => mockLoaderData,
        },
      ],
      isAuth: true,
      initialEntries: ['/account'],
    })

    await waitFor(() => {
      // Check that user information is displayed
      expect(screen.getByText(MOCK_USER.email)).toBeInTheDocument()

      // Check for membership duration text
      expect(screen.getByText(/Member since/i)).toBeInTheDocument()

      // Check for avatar placeholder since no avatar is provided
      expect(screen.getByTestId('user-circle-icon')).toBeInTheDocument()

      // Check for delete account button
      expect(screen.getByRole('button', { name: 'Delete account' })).toBeInTheDocument()
      expect(screen.getByTestId('delete-account-form')).toBeInTheDocument()
    })
  })

  test('shows avatar when user has one', async () => {
    // Ensure mockLoaderData has an avatar for this test
    // The component expects a transformed HominemUser with image property
    mockLoaderData = {
      user: {
        id: MOCK_USER.id,
        email: MOCK_USER.email || '',
        name: MOCK_USER.user_metadata?.name || MOCK_USER.user_metadata?.full_name,
        image: 'https://example.com/avatar.jpg',
        supabaseId: MOCK_USER.id,
        isAdmin: false,
        createdAt: MOCK_USER.created_at || new Date().toISOString(),
        updatedAt: MOCK_USER.updated_at || MOCK_USER.created_at || new Date().toISOString(),
      },
    }

    // Mock delete account mutation
    const mockDeleteMutation = {
      mutate: vi.fn() as (...args: unknown[]) => unknown,
      isPending: false,
      isLoading: false,
      isError: false,
      error: null as null | { message: string },
    }
    mockTrpcClient.user.deleteAccount.useMutation.mockReturnValue(
      mockDeleteMutation as unknown as ReturnType<
        typeof mockTrpcClient.user.deleteAccount.useMutation
      >
    )

    renderWithRouter({
      routes: [
        {
          path: '/account',
          Component: Account as any,
          loader: () => mockLoaderData,
        },
      ],
      isAuth: true,
      initialEntries: ['/account'],
    })

    await waitFor(() => {
      // Look for the avatar image
      const avatar = screen.getByAltText('user avatar')
      expect(avatar).toBeInTheDocument()
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')

      // UserCircle icon shouldn't be present
      expect(screen.queryByTestId('user-circle-icon')).not.toBeInTheDocument()
    })
  })

  test('shows error alert when deletion has error', async () => {
    // Mock delete account mutation to throw error
    const mockDeleteMutation = {
      mutate: vi.fn() as (...args: unknown[]) => unknown,
      isPending: false,
      isLoading: false, // For backward compatibility
      isError: true,
      error: { message: 'Failed to delete account' },
    }
    mockTrpcClient.user.deleteAccount.useMutation.mockReturnValue(
      mockDeleteMutation as unknown as ReturnType<
        typeof mockTrpcClient.user.deleteAccount.useMutation
      >
    )

    renderWithRouter({
      routes: [
        {
          path: '/account',
          Component: Account as any,
          loader: () => mockLoaderData,
        },
      ],
      isAuth: true,
      initialEntries: ['/account'],
    })

    await waitFor(() => {
      expect(screen.getByTestId('delete-account-form')).toBeInTheDocument()
    })

    // Click the delete account button
    screen.getByTestId('delete-account-form').click()

    await waitFor(() => {
      expect(screen.getByTestId('delete-account-error')).toBeInTheDocument()
    })
  })
})
