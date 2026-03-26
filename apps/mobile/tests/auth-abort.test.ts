import { describe, expect, it } from 'vitest'

import { createAbortSignalWithTimeout } from '../utils/auth/abort'

describe('createAbortSignalWithTimeout', () => {
  it('aborts when the timeout elapses', async () => {
    const { signal, cleanup } = createAbortSignalWithTimeout(5)

    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(signal.aborted).toBe(true)
    cleanup()
  })

  it('mirrors external aborts', () => {
    const controller = new AbortController()
    const { signal, cleanup } = createAbortSignalWithTimeout(1000, controller.signal)

    controller.abort()

    expect(signal.aborted).toBe(true)
    cleanup()
  })
})
