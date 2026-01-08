import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Route } from './+types/images'



const makeRequest = (url: string) => {
  return new Request(url, { method: 'GET', headers: { 'User-Agent': 'test-agent' } })
}

describe('rocco /api/images loader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // Ensure env var is set for any code that reads process.env directly
    process.env.VITE_GOOGLE_API_KEY = 'test-key'
  })

  it('returns image for Places v1 resource', async () => {
    const fakeBuffer = new Uint8Array([1, 2, 3]).buffer

    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        new Response(fakeBuffer, { status: 200, headers: { 'content-type': 'image/png' } })
      )

    // @ts-expect-error - override global fetch in test
    global.fetch = fetchSpy

    const resource = 'places/PLACE_ID/photos/PHOTO_ID'
    const req = makeRequest(
      `http://localhost/api/images?resource=${encodeURIComponent(resource)}&width=100&height=200`
    )
    const { loader } = await import('./images')
    const resp = await loader({ request: req } as unknown as Route.LoaderArgs)

    expect(resp.status).toBe(200)
    expect(resp.headers.get('content-type')).toBe('image/png')

    const body = new Uint8Array(await resp.arrayBuffer())
    expect(Array.from(body)).toEqual([1, 2, 3])

    expect(fetchSpy).toHaveBeenCalled()
    const calledUrl = fetchSpy.mock.calls[0][0] as unknown as string
    expect(String(calledUrl)).toContain('places.googleapis.com')
    expect(String(calledUrl)).toContain(`key=${process.env.VITE_GOOGLE_API_KEY}`)
  })

  it('returns image for legacy photoreference', async () => {
    const fakeBuffer = new Uint8Array([4, 5, 6]).buffer

    const fetchSpy = vi
      .fn()
      .mockResolvedValue(
        new Response(fakeBuffer, { status: 200, headers: { 'content-type': 'image/jpeg' } })
      )

    // @ts-expect-error - override global fetch in test
    global.fetch = fetchSpy

    const photoref = 'AZLaLegacyPhotoRef'
    const req = makeRequest(
      `http://localhost/api/images?photoreference=${encodeURIComponent(photoref)}&width=300&height=300`
    )
    const { loader } = await import('./images')
    const resp = await loader({ request: req } as unknown as Route.LoaderArgs)

    expect(resp.status).toBe(200)
    expect(resp.headers.get('content-type')).toBe('image/jpeg')

    const body = new Uint8Array(await resp.arrayBuffer())
    expect(Array.from(body)).toEqual([4, 5, 6])

    expect(fetchSpy).toHaveBeenCalled()
    const calledUrl = fetchSpy.mock.calls[0][0] as unknown as string
    expect(String(calledUrl)).toContain('maps.googleapis.com')
    expect(String(calledUrl)).toContain(`key=${process.env.VITE_GOOGLE_API_KEY}`)
  })
})
