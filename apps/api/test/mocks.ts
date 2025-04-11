import type { place } from '@hominem/utils/schema'

const ADDRESS = '123 Main St, Anytown, USA'
const NAME = 'Really Cool Place'
const TYPES = ['cafe', 'restaurant']
const PHOTO_URL = 'https://test.com/photo.jpg'

export const MOCKS = {
  PLACE: {
    id: '123',
    address: ADDRESS,
    name: NAME,
    googleMapsId: '123',
    types: TYPES,
    latitude: 1,
    longitude: 1,
    imageUrl: PHOTO_URL,
    photos: [PHOTO_URL],
    userId: '123',
    location: [1, 1],
  } as typeof place.$inferInsert,
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
}
