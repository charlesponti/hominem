import type { User } from '@supabase/supabase-js';

import type { List, Place } from '~/lib/types';

export * from './place';

export const USER_ID = 'user-id';
export const TEST_USER_EMAIL = 'test-user@ponti.io';
export const TEST_USER_NAME = 'Test User';

export const TEST_USER: User = {
  id: USER_ID,
  email: TEST_USER_EMAIL,
  user_metadata: {
    name: TEST_USER_NAME,
    full_name: TEST_USER_NAME,
    first_name: 'Test',
    last_name: 'User',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  email_confirmed_at: undefined,
  phone: undefined,
  phone_confirmed_at: undefined,
  confirmation_sent_at: undefined,
  recovery_sent_at: undefined,
  last_sign_in_at: undefined,
  role: undefined,
  identities: [],
  factors: [],
};

export const getMockUser = () => ({
  id: USER_ID,
  name: TEST_USER_NAME,
  email: TEST_USER_EMAIL,
  user_metadata: {
    name: TEST_USER_NAME,
    full_name: TEST_USER_NAME,
    first_name: 'Test',
    last_name: 'User',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  email_confirmed_at: undefined,
  phone: undefined,
  phone_confirmed_at: undefined,
  confirmation_sent_at: undefined,
  recovery_sent_at: undefined,
  last_sign_in_at: undefined,
  role: undefined,
  identities: [],
  factors: [],
});

export const getMockPlace = (): Place => ({
  id: '123',
  name: 'Place Name',
  description: 'Description',
  address: '123 Test St',
  createdAt: '2021-01-01T00:00:00.000Z',
  updatedAt: '2021-01-01T00:00:00.000Z',
  itemId: '123',
  googleMapsId: '123',
  types: ['type1', 'type2'],
  imageUrl: 'https://example.com/image.jpg',
  phoneNumber: null,
  rating: 4.5,
  websiteUri: null,
  latitude: 37.7749,
  longitude: -122.4194,
  location: [37.7749, -122.4194],
  bestFor: null,
  isPublic: false,
  wifiInfo: null,
  photos: [],
  priceLevel: null,
  businessStatus: null,
  openingHours: null,
});

export const getMockLists = () => [
  {
    id: '1',
    name: 'List 1',
    description: 'Test list 1',
    userId: USER_ID,
    isPublic: false,
    createdAt: '2021-01-01T00:00:00.000Z',
    updatedAt: '2021-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'List 2',
    description: 'Test list 2',
    userId: USER_ID,
    isPublic: false,
    createdAt: '2021-01-01T00:00:00.000Z',
    updatedAt: '2021-01-01T00:00:00.000Z',
  },
];

export const MOCK_LIST: List = {
  id: 'list-1',
  name: 'Coffee Spots',
  description: 'Great places for coffee',
  userId: USER_ID,
  isPublic: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  places: [],
  createdBy: getMockUser(),
};

export const MOCK_LISTS: List[] = [
  MOCK_LIST,
  {
    id: 'list-2',
    name: 'Weekend Getaways',
    description: 'Places to visit on weekends',
    userId: USER_ID,
    isPublic: false,
    places: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: getMockUser(),
  },
];
