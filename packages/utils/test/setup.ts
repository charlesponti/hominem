import { vi } from 'vitest'

// Set NODE_ENV to test for environment variable defaults
process.env.NODE_ENV = 'test'

// Mock external services that shouldn't be called in tests
vi.mock('sendgrid', () => ({
  setApiKey: vi.fn(),
  send: vi.fn(),
}))

