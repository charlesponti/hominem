import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render, screen } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import { TEST_USER_EMAIL, TEST_USER_NAME, USER_ID } from './mocks'

const mockSupabaseUser = {
  id: USER_ID,
  email: TEST_USER_EMAIL,
  user_metadata: {
    name: TEST_USER_NAME,
    full_name: TEST_USER_NAME,
    first_name: 'Test',
    last_name: 'User',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

const mockSession = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockSupabaseUser,
}

vi.mock('~/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: mockSession } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: mockSupabaseUser } }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

vi.mock('~/lib/auth-provider', () => ({
  useAuth: () => ({
    user: mockSupabaseUser,
    session: mockSession,
    isLoading: false,
    isSignedIn: true,
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
  }),
  useUser: () => ({
    user: {
      id: USER_ID,
      email: TEST_USER_EMAIL,
      fullName: TEST_USER_NAME,
      firstName: 'Test',
      lastName: 'User',
      primaryEmailAddress: { emailAddress: TEST_USER_EMAIL },
      imageUrl: 'https://example.com/avatar.jpg',
    },
    isLoaded: true,
  }),
  useClerk: () => ({
    signOut: vi.fn(),
  }),
}))

// Mock React Router's useRouteLoaderData hook
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useRouteLoaderData: (routeId: string) => {
      if (routeId === 'routes/layout') {
        return {
          user: mockSupabaseUser,
          isAuthenticated: true,
        }
      }
      return null
    },
  }
})

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

const mockTrpcClient = {
  lists: {
    getAll: {
      useQuery: vi.fn(),
    },
    getById: {
      useQuery: vi.fn(),
    },
    update: {
      useMutation: vi.fn(),
    },
    delete: {
      useMutation: vi.fn(),
    },
  },
  places: {
    getAll: {
      useQuery: vi.fn(),
    },
    getById: {
      useQuery: vi.fn(),
    },
    getNearbyFromLists: {
      useQuery: vi.fn(),
    },
    create: {
      useMutation: vi.fn(),
    },
    update: {
      useMutation: vi.fn(),
    },
    delete: {
      useMutation: vi.fn(),
    },
  },
  items: {
    getByListId: {
      useQuery: vi.fn(),
    },
    addToList: {
      useMutation: vi.fn(),
    },
    removeFromList: {
      useMutation: vi.fn(),
    },
  },
  invites: {
    getAll: {
      useQuery: vi.fn(),
    },
    getByList: {
      useQuery: vi.fn(),
    },
    create: {
      useMutation: vi.fn(),
    },
    accept: {
      useMutation: vi.fn(),
    },
    decline: {
      useMutation: vi.fn(),
    },
  },
  user: {
    getProfile: {
      useQuery: vi.fn(),
    },
    deleteAccount: {
      useMutation: vi.fn(),
    },
  },
}

vi.mock('~/lib/trpc/client', () => ({
  trpc: mockTrpcClient,
}))

const MockTRPCProvider = ({ children }: { children: ReactNode }) => <>{children}</>

vi.mock('~/lib/trpc/provider', () => ({
  TRPCProvider: MockTRPCProvider,
}))

export { mockTrpcClient }

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
  }: {
    queryClient?: QueryClient
  } = {},
  options: RenderOptions = {}
) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>, options)
}

export function renderWithRouter(
  config: {
    routes: Array<{
      path: string
      Component: React.ComponentType
      loader?: () => unknown
      ErrorBoundary?: React.ComponentType
    }>
    isAuth?: boolean
    initialEntries?: string[]
  },
  {
    queryClient = createTestQueryClient(),
  }: {
    queryClient?: QueryClient
  } = {}
) {
  const router = createMemoryRouter(config.routes, {
    initialEntries: config.initialEntries || ['/'],
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export function waitForLoadingToFinish() {
  return screen.findByTestId('app-main')
}

export function getByTestId(testId: string) {
  return screen.getByTestId(testId)
}

export function queryByTestId(testId: string) {
  return screen.queryByTestId(testId)
}

export function findByTestId(testId: string) {
  return screen.findByTestId(testId)
}

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(global as typeof globalThis).ResizeObserver = ResizeObserver
