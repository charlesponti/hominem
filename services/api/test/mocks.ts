import type { Place } from '@hominem/db/types/places';

const ADDRESS = '123 Main St, Anytown, USA';
const NAME = 'Really Cool Place';
const TYPES = ['cafe', 'restaurant'];
const PHOTO_URL = 'https://test.com/photo.jpg';

export const MOCKS = {
  PLACE: {
    id: '123',
    name: NAME,
    description: null,
    address: ADDRESS,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    itemId: null,
    googleMapsId: '123',
    types: TYPES,
    imageUrl: PHOTO_URL,
    phoneNumber: null,
    rating: null,
    websiteUri: null,
    photos: [PHOTO_URL],
    priceLevel: null,
    location: [1, 1],
    latitude: 1,
    longitude: 1,
    bestFor: null,
    isPublic: false,
    wifiInfo: null,
    businessStatus: null,
    openingHours: null,
  } as Place,
  GOOGLE_PLACE_GET: {
    data: {
      id: '123',
      location: { latitude: 1, longitude: 1 },
      adrFormatAddress: ADDRESS,
      displayName: { text: NAME },
      types: TYPES,
      photos: [{ name: 'test' }],
    },
  },
  GOOGLE_PHOTO_MEDIA: {
    data: 'test blob',
    request: {
      responseURL: PHOTO_URL,
    },
  },
};
