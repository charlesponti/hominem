import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildPhotoMediaUrl, createPlacePhotoUrlBuilder } from '../images'

describe('buildPhotoMediaUrl', () => {
  it('builds a Google Places media URL with correct query params', () => {
    const url = buildPhotoMediaUrl({
      key: 'test-key',
      photoName: 'places/abc/photos/1',
      maxWidthPx: 1600,
      maxHeightPx: 1200,
    })

    expect(url.startsWith('https://places.googleapis.com/v1/places/abc/photos/1/media')).toBe(true)
    expect(url).toContain('maxWidthPx=1600')
    expect(url).toContain('maxHeightPx=1200')
    expect(url).toContain('key=test-key')
  })
})

describe('createPlacePhotoUrlBuilder', () => {
  const apiKey = 'my-key'
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('returns null when apiKey is not provided', () => {
    const builder = createPlacePhotoUrlBuilder(undefined)
    expect(builder('places/abc/photos/1')).toBeNull()
  })

  it('returns absolute URLs unchanged', () => {
    const builder = createPlacePhotoUrlBuilder(apiKey)
    const abs = 'https://lh3.googleusercontent.com/abc'
    expect(builder(abs)).toBe(abs)
  })

  it('strips query params and builds url for references', () => {
    const builder = createPlacePhotoUrlBuilder(apiKey)
    const input = 'places/abc/photos/1?foo=bar'
    const url = builder(input)
    const expected = buildPhotoMediaUrl({
      key: apiKey,
      photoName: 'places/abc/photos/1',
      maxWidthPx: 1600,
      maxHeightPx: 1600,
    })
    expect(url).toBe(expected)
  })

  it('warns for suspicious paths', () => {
    const builder = createPlacePhotoUrlBuilder(apiKey)
    expect(builder('weird/path')).toBeTruthy()
    expect(warnSpy).toHaveBeenCalled()
  })

  it('returns null for empty path', () => {
    const builder = createPlacePhotoUrlBuilder(apiKey)
    expect(builder('')).toBeNull()
  })
})
