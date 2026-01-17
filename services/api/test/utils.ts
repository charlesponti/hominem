import type { Context } from 'hono'
import { vi } from 'vitest'

// biome-ignore lint/suspicious/noExplicitAny: Mock context needs flexible typing for tests
export function getMockContext(variables: Record<string, any> = {}): Context {
  const mockContext = {
    req: {
      url: 'http://localhost:4040/test',
      method: 'GET',
      header: vi.fn(),
      json: vi.fn(),
      text: vi.fn(),
    },
    res: {},
    set: vi.fn(),
    get: vi.fn((key: string) => variables[key]),
    json: vi.fn(),
    text: vi.fn(),
    status: vi.fn(),
    header: vi.fn(),
    var: variables,
    env: {},
    // biome-ignore lint/suspicious/noExplicitAny: Mock context needs flexible typing for tests
  } as any as Context

  return mockContext
}

// Mock Next function for middleware testing
export const getMockNext = () => vi.fn(() => Promise.resolve())
