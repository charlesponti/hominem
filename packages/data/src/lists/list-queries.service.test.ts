import { describe, expect, it } from 'vitest'
import { getDefaultPhotoUrlBuilder } from './list-queries.service'

describe('getDefaultPhotoUrlBuilder', () => {
  it('returns a URL with key when GOOGLE_API_KEY is set', () => {
    process.env.GOOGLE_API_KEY = 'test-key-123'
    const builder = getDefaultPhotoUrlBuilder()
    const ref = 'places/someplace/photos/a-photo'
    const url = builder(ref)
    expect(typeof url).toBe('string')
    expect(url).toContain('key=test-key-123')
  })

  it('returns the ref unchanged when GOOGLE_API_KEY is not set', () => {
    // biome-ignore lint/performance/noDelete: For testing
    delete process.env.GOOGLE_API_KEY
    const builder = getDefaultPhotoUrlBuilder()
    const ref = 'places/someplace/photos/a-photo'
    const out = builder(ref)
    expect(out).toBe(ref)
  })
})
