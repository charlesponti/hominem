import { createElement } from 'react'
import { vi } from 'vitest'

import type { ListPlace, Place } from '~/lib/types'

vi.mock('@vis.gl/react-google-maps', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    useApiIsLoaded: () => true,
    useApiLoadingStatus: vi.fn(),
    Map: () => createElement('div', { 'data-testid': 'google-map' }),
  }
})

export const PLACE_ID = 'place-id'

export const MOCK_PLACE: Place = {
  id: PLACE_ID,
  googleMapsId: '123',
  name: 'test place',
  description: 'Test place description',
  imageUrl: 'test-image-url',
  types: ['test_type'],
  address: '123 Test Street, Test City',
  phoneNumber: '+1 (123) 456-7890',
  latitude: 123.456,
  longitude: 789.012,
  location: [123.456, 789.012],
  photos: ['test-photo-url-1', 'test-photo-url-2'],
  priceLevel: 2,
  rating: 4.5,
  websiteUri: 'https://test-place.example.com',
  bestFor: null,
  isPublic: false,
  wifiInfo: null,
  createdAt: '2021-01-01T00:00:00.000Z',
  updatedAt: '2021-01-01T00:00:00.000Z',
  userId: 'user-id',
  itemId: null,
}

// Create a mock place that conforms to ListPlace type
export const MOCK_LIST_PLACE: ListPlace = {
  id: MOCK_PLACE.id,
  imageUrl: MOCK_PLACE.imageUrl,
  name: MOCK_PLACE.name,
  googleMapsId: MOCK_PLACE.googleMapsId,
  types: MOCK_PLACE.types,
  description: 'Test place description',
  address: MOCK_PLACE.address,
  latitude: MOCK_PLACE.latitude || 0,
  longitude: MOCK_PLACE.longitude || 0,
  phoneNumber: MOCK_PLACE.phoneNumber,
  rating: MOCK_PLACE.rating,
  websiteUri: MOCK_PLACE.websiteUri,
  bestFor: null,
  wifiInfo: null,
  photos: MOCK_PLACE.photos,
  priceLevel: MOCK_PLACE.priceLevel,
}

export const MOCK_PLACE_SEARCH = [
  {
    googleMapsId: 'place-id',
    name: 'New York',
    latitude: 456,
    longitude: 678,
  },
]
