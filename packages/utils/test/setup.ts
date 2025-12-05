import { vi } from 'vitest'

// Set NODE_ENV to test for environment variable defaults
process.env.NODE_ENV = 'test'

// Mock external services that shouldn't be called in tests
vi.mock('resend', () => {
  const send = vi.fn()
  return {
    Resend: vi.fn(() => ({
      emails: { send },
    })),
  }
})
