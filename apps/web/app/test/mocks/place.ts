import type { ListPlace as DataListPlace } from '@hominem/services/lists';
import { createElement } from 'react';
import { vi } from 'vitest';

import type { GooglePlaceData, Place } from '~/lib/types';
import { TEST_USER_EMAIL, TEST_USER_NAME, USER_ID } from './index';

vi.mock('@vis.gl/react-google-maps', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useApiIsLoaded: () => true,
    useApiLoadingStatus: vi.fn(),
    Map: () => createElement('div', { 'data-testid': 'google-map' }),
  };
});

export const PLACE_ID = 'place-id';

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
  itemId: null,
  businessStatus: null,
  openingHours: null,
};

// Create a mock place that conforms to ListPlace type
export const MOCK_LIST_PLACE: GooglePlaceData = {
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
};

export const MOCK_PLACE_SEARCH = [
  {
    googleMapsId: 'place-id',
    name: 'New York',
    latitude: 456,
    longitude: 678,
  },
];

/**
 * Creates a mock ListPlace (from @hominem/services) from a Place mock
 * @param overrides - Optional overrides for specific fields
 */
export const getMockListPlace = (overrides?: Partial<DataListPlace>): DataListPlace => ({
  id: MOCK_PLACE.id,
  placeId: 'test-place-id', // The place entity ID (was confusingly named itemId)
  itemAddedAt: new Date().toISOString(),
  type: 'place',
  imageUrl: MOCK_PLACE.imageUrl,
  name: MOCK_PLACE.name,
  googleMapsId: MOCK_PLACE.googleMapsId,
  types: MOCK_PLACE.types,
  description: MOCK_PLACE.description || '',
  address: MOCK_PLACE.address,
  latitude: MOCK_PLACE.latitude || 37.7749,
  longitude: MOCK_PLACE.longitude || -122.4194,
  rating: MOCK_PLACE.rating,
  photos: MOCK_PLACE.photos,
  addedBy: {
    id: USER_ID,
    name: TEST_USER_NAME,
    email: TEST_USER_EMAIL,
    image: null,
  },
  ...overrides,
});
