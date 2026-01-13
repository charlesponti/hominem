import { buildPhotoMediaUrl } from '@hominem/utils/google'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getPlaceDetails,
  getPlacePhotos,
  googlePlacesTestUtils,
  searchPlaces,
} from '../google-places.server'

const createFetchResponse = (
  data: unknown,
  overrides?: { ok?: boolean; status?: number; statusText?: string }
) =>
  ({
    ok: overrides?.ok ?? true,
    status: overrides?.status ?? 200,
    statusText: overrides?.statusText ?? 'OK',
    json: async () => data,
    text: async () => JSON.stringify(data),
  }) as unknown as Response

describe('google-places.server helper', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    process.env.GOOGLE_API_KEY = 'test-key'
    googlePlacesTestUtils.clearCache()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('caches search results for identical queries', async () => {
    const payload = {
      places: [
        {
          id: 'place-1',
          displayName: { text: 'Coffee Bar' },
          formattedAddress: '123 Beans St',
          location: { latitude: 37.5, longitude: -122.3 },
          types: ['cafe'],
        },
      ],
    }

    fetchMock.mockResolvedValue(createFetchResponse(payload))

    const params = {
      query: 'coffee',
      locationBias: { latitude: 37.5, longitude: -122.3, radius: 500 },
    }
    const first = await searchPlaces(params)
    const second = await searchPlaces(params)

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('surfaces Google API errors when fetching details', async () => {
    fetchMock.mockResolvedValue(
      createFetchResponse(
        { error: { message: 'quota exceeded' } },
        { ok: false, status: 500, statusText: 'Server Error' }
      )
    )

    await expect(getPlaceDetails({ placeId: 'bad-id', forceFresh: true })).rejects.toThrow(
      /Google Places API request failed/
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('returns limited photo references via getPlacePhotos', async () => {
    fetchMock.mockResolvedValue(
      createFetchResponse({
        photos: [{ name: 'places/foo/photos/1' }, { name: 'places/foo/photos/2' }],
      })
    )

    const photos = await getPlacePhotos({ placeId: 'foo', limit: 1, forceFresh: true })
    expect(photos).toEqual(['places/foo/photos/1'])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('buildPhotoMediaUrl includes api key and sizing params', () => {
    const url = buildPhotoMediaUrl({
      key: 'test-key',
      pathname: 'places/foo/photos/1',
      maxWidthPx: 800,
      maxHeightPx: 600,
    })

    expect(url).toContain('places/foo/photos/1/media')
    expect(url).toContain('maxWidthPx=800')
    expect(url).toContain('maxHeightPx=600')
    expect(url).toContain('key=test-key')
  })
})
