import { afterAll, beforeAll, vi } from 'vitest'

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
