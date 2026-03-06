import { describe, expect, it } from 'vitest'

import {
  getQueryRetryDelayMs,
  mobileQueryDefaultOptions,
  QUERY_PERSISTENCE_STRATEGY,
  shouldRetryQuery,
} from '../../utils/query-client-config'

describe('query client contract integration', () => {
  it('uses explicit disabled query persistence strategy', () => {
    expect(QUERY_PERSISTENCE_STRATEGY).toBe('disabled')
  })

  it('enforces offline-first cache mode for queries and mutations', () => {
    expect(mobileQueryDefaultOptions.queries?.networkMode).toBe('offlineFirst')
    expect(mobileQueryDefaultOptions.mutations?.networkMode).toBe('offlineFirst')
  })

  it('does not retry client 4xx errors', () => {
    const error = new Response('bad request', { status: 400 })
    expect(shouldRetryQuery(1, error)).toBe(false)
  })

  it('retries transient failures up to the configured max', () => {
    expect(shouldRetryQuery(0, new Error('network fail'))).toBe(true)
    expect(shouldRetryQuery(2, new Error('network fail'))).toBe(true)
    expect(shouldRetryQuery(4, new Error('network fail'))).toBe(false)
  })

  it('uses bounded exponential retry backoff', () => {
    expect(getQueryRetryDelayMs(0)).toBe(1000)
    expect(getQueryRetryDelayMs(1)).toBe(2000)
    expect(getQueryRetryDelayMs(2)).toBe(4000)
    expect(getQueryRetryDelayMs(10)).toBe(30000)
  })
})
