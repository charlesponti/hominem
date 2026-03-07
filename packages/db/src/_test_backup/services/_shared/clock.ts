import { vi } from 'vitest'

export function freezeTestClock(at: string | number | Date): () => void {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(at))

  return () => {
    vi.useRealTimers()
  }
}

export async function withFrozenTestClock<T>(
  at: string | number | Date,
  run: () => Promise<T>,
): Promise<T> {
  const restore = freezeTestClock(at)
  try {
    return await run()
  } finally {
    restore()
  }
}
