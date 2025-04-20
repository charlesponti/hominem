// filepath: /Users/charlesponti/Developer/hominem/apps/carmen/src/test/test.setup.ts
import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/svelte'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { MOCK_PLACE, PLACE_HANDLERS } from './mocks/place'
import './utils'

// Define API_URL here to avoid circular imports
export const API_URL = 'http://localhost:3000'

export const TEST_LIST_ID = 'list-id'

// Mock svelte imports
vi.mock('svelte/store', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as Record<string, unknown>)
  }
})

// The mock for svelte-navigator is in utils.ts

// Mock auth stores
vi.mock('../lib/clerk', async () => {
  return {
    user: { subscribe: vi.fn() },
    isAuthenticated: { subscribe: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
    initializeClerk: vi.fn(),
    isClerkLoaded: { subscribe: vi.fn(), set: vi.fn() }
  }
})

// REST handlers for MSW
const restHandlers = [
  http.get(`${API_URL}/lists/${TEST_LIST_ID}`, () => {
    return HttpResponse.json({
      id: TEST_LIST_ID,
      name: 'test list',
      items: [MOCK_PLACE]
    })
  }),
  ...PLACE_HANDLERS
]

export const testServer = setupServer(...restHandlers)

// Start server before all tests
beforeAll(() => {
  testServer.listen({ onUnhandledRequest: 'error' })
})

// Close server after all tests
afterAll(() => testServer.close())

// Reset handlers after each test `important for test isolation`
afterEach(() => {
  testServer.resetHandlers()
  vi.resetAllMocks()
  cleanup()
})
