import { expect } from 'vitest'

interface ErrorShape {
  message?: string
  code?: string
  statusCode?: number
}

function toErrorShape(value: unknown): ErrorShape {
  if (!value || typeof value !== 'object') {
    return {}
  }
  const candidate = value as { message?: unknown; code?: unknown; statusCode?: unknown }
  const shape: ErrorShape = {}
  if (typeof candidate.message === 'string') {
    shape.message = candidate.message
  }
  if (typeof candidate.code === 'string') {
    shape.code = candidate.code
  }
  if (typeof candidate.statusCode === 'number') {
    shape.statusCode = candidate.statusCode
  }
  return shape
}

export async function expectNotFound(
  run: () => Promise<unknown>,
  messageIncludes?: string,
): Promise<void> {
  try {
    await run()
    expect.unreachable('expected not-found failure')
  } catch (error) {
    const shape = toErrorShape(error)
    const isNotFound = shape.code === 'NOT_FOUND' || shape.statusCode === 404
    expect(isNotFound).toBe(true)
    if (messageIncludes) {
      expect(shape.message ?? '').toContain(messageIncludes)
    }
  }
}

export async function expectOwnershipDenied(
  run: () => Promise<unknown>,
  messageIncludes?: string,
): Promise<void> {
  try {
    await run()
    expect.unreachable('expected ownership failure')
  } catch (error) {
    const shape = toErrorShape(error)
    const denied = shape.code === 'FORBIDDEN' || shape.statusCode === 403 || shape.statusCode === 401
    expect(denied).toBe(true)
    if (messageIncludes) {
      expect(shape.message ?? '').toContain(messageIncludes)
    }
  }
}

export async function expectIdempotentValue<T>(
  run: () => Promise<T>,
  assertEqual: (first: T, second: T) => void,
): Promise<void> {
  const first = await run()
  const second = await run()
  assertEqual(first, second)
}
