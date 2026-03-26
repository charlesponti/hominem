import { vi } from 'vitest'

type MockContextVariables = Record<string, unknown>

export interface MockContext {
  env: Record<string, never>
  get: ReturnType<typeof vi.fn<(key: string) => unknown>>
  header: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  req: {
    header: ReturnType<typeof vi.fn>
    json: ReturnType<typeof vi.fn>
    method: string
    text: ReturnType<typeof vi.fn>
    url: string
  }
  res: Record<string, never>
  set: ReturnType<typeof vi.fn>
  status: ReturnType<typeof vi.fn>
  text: ReturnType<typeof vi.fn>
  var: MockContextVariables
}

export function getMockContext(variables: MockContextVariables = {}): MockContext {
  return {
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
  }
}

// Mock Next function for middleware testing
export const getMockNext = () => vi.fn(() => Promise.resolve())
