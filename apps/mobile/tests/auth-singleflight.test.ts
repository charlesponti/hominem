import { describe, expect, it, vi } from 'vitest'

import { runSingleflight, type SingleflightRef } from '../utils/auth/singleflight'

describe('runSingleflight', () => {
  it('reuses one in-flight promise for concurrent callers and resets after resolution', async () => {
    let resolveValue: ((value: string) => void) | null = null
    const ref: SingleflightRef<string> = { current: null }
    const factory = vi.fn(() => new Promise<string>((resolve) => {
      resolveValue = resolve
    }))

    const first = runSingleflight(ref, factory)
    const second = runSingleflight(ref, factory)

    expect(factory).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)

    resolveValue?.('token-1')
    await expect(first).resolves.toBe('token-1')
    expect(ref.current).toBeNull()

    const third = runSingleflight(ref, factory)
    expect(factory).toHaveBeenCalledTimes(2)
    expect(third).not.toBe(first)
  })
})
