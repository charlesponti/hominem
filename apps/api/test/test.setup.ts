import { afterAll, beforeAll, vi } from 'vitest'

// Set NODE_ENV to test for environment variable defaults
process.env.NODE_ENV = 'test'

// Mock Supabase environment variables for tests
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.SUPABASE_JWT_SECRET = 'test-jwt-secret'

// Redis is running in Docker for tests - no mocking needed

vi.mock('sendgrid', () => ({
  setApiKey: vi.fn(),
  send: vi.fn(),
}))

vi.mock('../src/analytics', () => ({
  track: vi.fn(),
  EVENTS: {
    USER_EVENTS: {},
  },
}))

vi.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: vi.fn(),
    },
    options: vi.fn(),
    places: vi.fn(() => ({
      places: {
        get: vi.fn(),
        photos: {
          getMedia: vi.fn(),
        },
        searchText: vi.fn(),
      },
    })),
  },
}))

// Global test setup - no longer seeding finance test data globally
beforeAll(async () => {
  // Any global setup can go here
})

// Global test cleanup - no longer cleaning up finance test data globally
afterAll(async () => {
  // Any global cleanup can go here
})
