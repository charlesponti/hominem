import { vi } from 'vitest'

vi.mock('@hominem/utils/redis', () => ({
  redis: {
    duplicate: vi.fn(() => ({
      on: vi.fn(),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
      quit: vi.fn(() => new Promise((resolve) => resolve(null))),
    })),
    zadd: vi.fn(),
    zremrangebyscore: vi.fn(),
    zcard: vi.fn(),
  },
  checkRateLimit: vi.fn(),
  waitForRateLimit: vi.fn(),
}))

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
