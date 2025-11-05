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
    const userWithoutAvatar = {
      ...MOCK_USER,
      user_metadata: {
        ...MOCK_USER.user_metadata,
        avatar_url: '',
      },
    }

    // Update loader data to use user without avatar
    mockLoaderData.user = userWithoutAvatar

    // Mock user profile query
    mockTrpcClient.user.getProfile.useQuery.mockReturnValue({
      data: userWithoutAvatar,
      isLoading: false,
      error: null as null | { message: string },
    } as unknown as ReturnType<typeof mockTrpcClient.user.getProfile.useQuery>)

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
          Component: Account,
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
      expect(screen.getByText('Delete account')).toBeInTheDocument()
      expect(screen.getByTestId('delete-account-form')).toBeInTheDocument()
    })
  })

  test('shows avatar when user has one', async () => {
    // Ensure mockLoaderData has an avatar for this test
    mockLoaderData = {
      user: {
        ...MOCK_USER,
        user_metadata: {
          ...MOCK_USER.user_metadata,
          avatar_url: 'https://example.com/avatar.jpg',
        },
      },
    }

    // Mock user profile query with avatar
    mockTrpcClient.user.getProfile.useQuery.mockReturnValue({
      data: mockLoaderData.user,
      isLoading: false,
      error: null as null | { message: string },
    } as unknown as ReturnType<typeof mockTrpcClient.user.getProfile.useQuery>)

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
          Component: Account,
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
    // Mock user profile query
    mockTrpcClient.user.getProfile.useQuery.mockReturnValue({
      data: MOCK_USER,
      isLoading: false,
      error: null as null | { message: string },
    } as unknown as ReturnType<typeof mockTrpcClient.user.getProfile.useQuery>)

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
          Component: Account,
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
