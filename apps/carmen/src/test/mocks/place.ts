import { http, HttpResponse } from 'msw'
import { vi } from 'vitest'

import { API_URL } from 'src/lib/store'

// Mock vis.gl Google maps
vi.mock('@vis.gl/react-google-maps', async () => {
  return {
    useApiIsLoaded: () => true,
    useApiLoadingStatus: vi.fn(),
    Map: vi.fn(),
  }
})

// Mock maplibre
vi.mock('maplibre-gl', () => ({
  Map: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    remove: vi.fn(),
  })),
}))

export const PLACE_ID = 'place-id'

export const MOCK_PLACE = {
  id: PLACE_ID,
  itemId: PLACE_ID,
  googleMapsId: '123',
  name: 'test place',
  imageUrl: 'test-image-url',
  types: ['test_type'],
}

export const MOCK_PLACE_SEARCH = [
  {
    googleMapsId: 'place-id',
    name: 'New York',
    latitude: 456,
    longitude: 678,
  },
]

export const PLACE_HANDLERS = [
  http.get(`${API_URL}/places/123`, () => {
    return HttpResponse.json(MOCK_PLACE)
  }),
  http.delete(`${API_URL}/lists/:listId/place/:placeId`, () => {
    return HttpResponse.json({ success: true })
  }),
  http.get(`${API_URL}/places/search`, () => {
    return HttpResponse.json(MOCK_PLACE_SEARCH)
  }),
]
