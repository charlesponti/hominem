import { vi } from 'vitest'
import { render, type RenderOptions } from '@testing-library/svelte'
import { writable, type Writable } from 'svelte/store'
import type { ComponentProps, SvelteComponent } from 'svelte'
import { http, HttpResponse } from 'msw'
import { API_URL } from '../lib/store'
import type { ListPlace, User } from '../lib/types'
import { testServer } from './test.setup'

// Test User constants
export const USER_ID = 'user-id'
export const TEST_USER_EMAIL = 'test-user@ponti.io'
export const TEST_USER_NAME = 'Test User'

// Mock store values
export const userStore: Writable<User | null> = writable(null)
export const isAuthenticatedStore = writable(false)
export const listsStore = writable([])
export const bookmarksStore = writable([])

// Mock Clerk functions
export const loginMock = {
  mutateAsync: vi.fn().mockResolvedValue(null),
}

export const logoutMock = {
  mutateAsync: vi.fn().mockResolvedValue(null),
}

// Mock data generators
export const getMockUser = (): User => ({
  id: USER_ID,
  avatar: 'https://example.com/avatar.jpg',
  email: TEST_USER_EMAIL,
  createdAt: '2021-01-01T00:00:00.000Z',
  updatedAt: '2021-01-01T00:00:00.000Z',
  isAdmin: 'false',
  name: TEST_USER_NAME,
})

export const getMockPlace = (): ListPlace => ({
  imageUrl: 'https://example.com/image.jpg',
  googleMapsId: '123',
  name: 'Place Name',
  types: ['type1', 'type2'],
  id: '123',
  itemId: '123',
  description: 'Description',
})

export const getMockLists = () => [
  {
    id: '1',
    name: 'List 1',
    createdAt: '2021-01-01T00:00:00.000Z',
    updatedAt: '2021-01-01T00:00:00.000Z',
    createdBy: getMockUser(),
    places: [getMockPlace()],
  },
  {
    id: '2',
    name: 'List 2',
    createdAt: '2021-01-01T00:00:00.000Z',
    updatedAt: '2021-01-01T00:00:00.000Z',
    createdBy: getMockUser(),
    places: [getMockPlace()],
  },
]

// Mock store for tests
export const mockStores = {
  user: userStore,
  isAuthenticated: isAuthenticatedStore,
  lists: listsStore,
  bookmarks: bookmarksStore,
  login: loginMock.mutateAsync,
  logout: logoutMock.mutateAsync,
}

// Setup authenticated or unauthenticated state
export function setupAuth(isAuth: boolean) {
  if (isAuth) {
    userStore.set(getMockUser())
    isAuthenticatedStore.set(true)
  } else {
    userStore.set(null)
    isAuthenticatedStore.set(false)
  }

  testServer.use(
    http.get(`${API_URL}/me`, () => {
      return isAuth
        ? HttpResponse.json(getMockUser())
        : HttpResponse.text('Unauthorized', { status: 401 })
    })
  )
}

// Setup store with provided values
export function setupStores({
  user = null,
  isAuthenticated = false,
  lists = [],
  bookmarks = [],
}: {
  user?: User | null
  isAuthenticated?: boolean
  lists?: unknown[]
  bookmarks?: unknown[]
} = {}) {
  userStore.set(user)
  isAuthenticatedStore.set(isAuthenticated)
  listsStore.set(lists)
  bookmarksStore.set(bookmarks)
}

// Helper to render with mocked store context
export function renderWithStores<Component extends SvelteComponent>(
  component: new (...args: unknown[]) => Component,
  {
    props = {},
    isAuth = false,
    ...options
  }: {
    props?: ComponentProps<Component>
    isAuth?: boolean
    options?: RenderOptions
  } = {}
) {
  // Setup auth state for testing
  setupAuth(isAuth)

  // Need to mock the store import in the component
  vi.doMock('../lib/store', () => {
    return {
      isAuthenticated: {
        subscribe: (callback) => {
          callback(isAuth)
          return { unsubscribe: vi.fn() }
        },
      },
      user: {
        subscribe: (callback) => {
          callback(isAuth ? getMockUser() : null)
          return { unsubscribe: vi.fn() }
        },
      },
      login: vi.fn(),
      logout: vi.fn(),
      lists: {
        subscribe: (callback) => {
          callback([])
          return { unsubscribe: vi.fn() }
        },
      },
      bookmarks: {
        subscribe: (callback) => {
          callback([])
          return { unsubscribe: vi.fn() }
        },
      },
      API_URL: 'http://localhost:3000',
    }
  })

  // Return the rendered component
  return render(component, {
    props,
    ...options,
  })
}

// Mock navigation function for tests
export const mockNavigate = vi.fn()

// Mock svelte-navigator
vi.mock('svelte-navigator', () => {
  return {
    navigate: mockNavigate,
    Router: vi.fn(),
    Route: vi.fn(),
    Link: vi.fn(),
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      subscribe: (callback) => {
        callback({ pathname: '/' })
        return { unsubscribe: vi.fn() }
      },
    }),
    useParams: () => ({
      subscribe: (callback) => {
        callback({ id: 'test-id' })
        return { unsubscribe: vi.fn() }
      },
    }),
  }
})

// Reset all mocks between tests
export function resetMocks() {
  vi.resetAllMocks()
  mockNavigate.mockReset()
  setupStores()
}
