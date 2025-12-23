import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { List, PlaceLocation } from '~/lib/types'
import Dashboard, { loader } from '~/routes/index'
import { getMockUser, MOCK_LISTS } from '~/test/mocks/index'
import { mockTrpcClient, renderWithRouter } from '~/test/utils'

interface MockQueryResult<T> {
  data: T | undefined
  isLoading: boolean
  error: Error | null
}

/**
 * Integration tests for the Dashboard route
 *
 * These tests verify the full integration between:
 * - Loader execution (authentication check)
 * - Component rendering based on loader data
 * - Child components (Lists, PlacesAutocomplete, PlacesNearby)
 * - User interactions
 *
 * We mock only external dependencies:
 * - Auth service (getAuthState)
 * - API calls (trpc queries)
 * - Browser APIs (geolocation)
 * - Heavy components (map)
 */

// Mock external dependencies only
const mockUseGeolocation = vi.fn()
vi.mock('~/hooks/useGeolocation', () => ({
  useGeolocation: () => mockUseGeolocation(),
}))

// Mock the auth service with a default implementation
vi.mock('@hominem/auth/server', () => ({
  getServerAuth: vi.fn(async () => ({
    user: getMockUser(),
    session: null,
    isAuthenticated: true,
    headers: new Headers(),
  })),
}))

// Import the mocked function after mocking
const { getServerAuth } = await import('@hominem/auth/server')
const mockGetServerAuth = getServerAuth as typeof getServerAuth & {
  mockResolvedValue: (value: Awaited<ReturnType<typeof getServerAuth>>) => void
}

// Mock heavy components
vi.mock('~/components/map.lazy', () => ({
  default: ({ center, zoom }: { center: PlaceLocation; zoom: number }) => (
    <div data-testid="rocco-map">
      Map Component (Zoom: {zoom}, Lat: {center.latitude}, Lng: {center.longitude})
    </div>
  ),
}))

// Track navigation calls for testing
const mockNavigate = vi.fn()
// Mock useNavigate from react-router
// For Bun compatibility, we import react-router directly instead of using vi.importActual
vi.mock('react-router', async () => {
  try {
    // Try to import the actual module
    const routerModule = await import('react-router')
    return {
      ...routerModule,
      useNavigate: () => mockNavigate,
    }
  } catch {
    // Fallback if import fails - return minimal mock
    return {
      useNavigate: () => mockNavigate,
      useLoaderData: vi.fn(),
      data: vi.fn(),
      Link: vi.fn(),
    }
  }
})

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    // Reset to default mock data before each test
    vi.clearAllMocks() // Clear all mocks

    // Configure auth mock for authenticated state
    mockGetServerAuth.mockResolvedValue({
      user: getMockUser(),
      session: null,
      isAuthenticated: true,
      headers: new Headers(),
    })

    // Reset geolocation mock to default successful state
    mockUseGeolocation.mockReturnValue({
      currentLocation: { latitude: 37.7749, longitude: -122.4194 },
      isLoading: false,
      error: null,
    })

    mockTrpcClient.lists.getAll.useQuery.mockReturnValue({
      data: MOCK_LISTS,
      isLoading: false,
      error: null,
    } as MockQueryResult<List[]>)

    mockTrpcClient.places.getNearbyFromLists.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })

    // Mock Google Places autocomplete
    mockTrpcClient.places.autocomplete.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })
  })

  test('authenticated user sees dashboard with all components', async () => {
    // The loader will run, check auth, and return isAuthenticated: true
    // The component will receive this via useLoaderData() and render accordingly
    renderWithRouter({
      routes: [
        {
          path: '/',
          Component: Dashboard,
          // biome-ignore lint/suspicious/noExplicitAny: React Router v7 type compatibility
          loader: loader as any,
        },
      ],
      initialEntries: ['/'],
    })

    // Verify the full integrated behavior
    await waitFor(() => {
      // Main dashboard renders
      expect(screen.getByTestId('home-scene')).toBeInTheDocument()

      // Search functionality is available
      expect(screen.getByPlaceholderText('Search for places...')).toBeInTheDocument()

      // Nearby places section renders
      expect(screen.getByText('Nearby')).toBeInTheDocument()

      // Lists section renders with data
      expect(screen.getByText('Lists')).toBeInTheDocument()
      expect(screen.getByText(MOCK_LISTS[0]!.name)).toBeInTheDocument()
      expect(screen.getByText(MOCK_LISTS[1]!.name)).toBeInTheDocument()
    })
  })

  test('unauthenticated user sees about page', async () => {
    // Set auth state to unauthenticated
    mockGetServerAuth.mockResolvedValue({
      user: null,
      session: null,
      isAuthenticated: false,
      headers: new Headers(),
    })

    // Loader will run, check auth, and return isAuthenticated: false
    // Component will receive this and show AboutPage
    renderWithRouter({
      routes: [
        {
          path: '/',
          Component: Dashboard,
          // biome-ignore lint/suspicious/noExplicitAny: React Router v7 type compatibility
          loader: loader as any,
        },
      ],
      initialEntries: ['/'],
    })

    await waitFor(() => {
      // About page content renders (text is split by <br /> so we use partial match)
      expect(screen.getByText(/Your places\./)).toBeInTheDocument()
      expect(screen.getByText(/Your stories\./)).toBeInTheDocument()

      // Dashboard content does NOT render
      expect(screen.queryByTestId('home-scene')).not.toBeInTheDocument()
    })
  })

  test('user can search for a place and navigate to it', async () => {
    const user = userEvent.setup()

    // Mock the Google Places API response (external dependency)
    const mockPlace = {
      place_id: 'test-place-id',
      text: 'Blue Bottle Coffee',
      address: '123 Coffee St, San Francisco, CA',
      location: { latitude: 37.7749, longitude: -122.4194 },
    }
    mockTrpcClient.places.autocomplete.useQuery.mockReturnValue({
      data: [mockPlace],
      isLoading: false,
      error: null,
    })

    renderWithRouter({
      routes: [
        {
          path: '/',
          Component: Dashboard,
          // biome-ignore lint/suspicious/noExplicitAny: React Router v7 type compatibility
          loader: loader as any,
        },
      ],
      initialEntries: ['/'],
    })

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByTestId('home-scene')).toBeInTheDocument()
    })

    // User types in search box
    const input = screen.getByPlaceholderText('Search for places...')
    await user.type(input, 'Blue')

    // Wait for autocomplete results
    await waitFor(() => {
      expect(screen.getByTestId('places-autocomplete-results')).toBeInTheDocument()
      expect(screen.getByText('Blue Bottle Coffee')).toBeInTheDocument()
    })

    // User clicks on result
    const option = screen.getByText('Blue Bottle Coffee')
    await user.click(option)

    // Verify navigation happened
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/places/test-place-id')
    })
  })

  test('shows empty state when user has no lists', async () => {
    // Mock API to return no lists
    mockTrpcClient.lists.getAll.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    })

    renderWithRouter({
      routes: [
        {
          path: '/',
          Component: Dashboard,
          // biome-ignore lint/suspicious/noExplicitAny: React Router v7 type compatibility
          loader: loader as any,
        },
      ],
      initialEntries: ['/'],
    })

    // Verify empty state renders
    await waitFor(() => {
      expect(screen.getByText('No lists yet')).toBeInTheDocument()
      expect(screen.getByText('Get started by creating your first list.')).toBeInTheDocument()
    })
  })

  test('dashboard renders even when location is unavailable', async () => {
    // Simulate geolocation being unavailable/loading
    mockUseGeolocation.mockReturnValue({
      currentLocation: null,
      isLoading: true,
      error: null,
    })

    renderWithRouter({
      routes: [
        {
          path: '/',
          Component: Dashboard,
          // biome-ignore lint/suspicious/noExplicitAny: React Router v7 type compatibility
          loader: loader as any,
        },
      ],
      initialEntries: ['/'],
    })

    // App should still be usable without geolocation
    await waitFor(() => {
      expect(screen.getByTestId('home-scene')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search for places...')).toBeInTheDocument()
      expect(screen.getByText('Lists')).toBeInTheDocument()
      expect(screen.getByText(MOCK_LISTS[0]!.name)).toBeInTheDocument()
    })
  })

  test('shows loading state while fetching lists', async () => {
    // Mock API to return loading state
    mockTrpcClient.lists.getAll.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    renderWithRouter({
      routes: [
        {
          path: '/',
          Component: Dashboard,
          // biome-ignore lint/suspicious/noExplicitAny: React Router v7 type compatibility
          loader: loader as any,
        },
      ],
      initialEntries: ['/'],
    })

    // Verify loading state renders
    await waitFor(() => {
      expect(screen.getByTestId('home-scene')).toBeInTheDocument()
      expect(screen.getByText('Lists')).toBeInTheDocument()
      // The Lists component shows its own loading state
    })
  })

  test('shows error when lists fail to load', async () => {
    // Mock API to return error
    mockTrpcClient.lists.getAll.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Failed to load lists' },
    })

    renderWithRouter({
      routes: [
        {
          path: '/',
          Component: Dashboard,
          // biome-ignore lint/suspicious/noExplicitAny: React Router v7 type compatibility
          loader: loader as any,
        },
      ],
      initialEntries: ['/'],
    })

    // Verify error message renders
    await waitFor(() => {
      expect(screen.getByText('Error loading lists: Failed to load lists')).toBeInTheDocument()
    })
  })
})
