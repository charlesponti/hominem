import { google, type places_v1 } from 'googleapis';
import { logger } from '@hominem/utils/logger';
import { redis } from '@hominem/utils/redis';

import type { GooglePlaceDetailsResponse, GooglePlacesApiResponse } from '~/lib/types';

export type SearchPlacesOptions = {
  query: string;
  locationBias?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  fieldMask?: string;
  maxResultCount?: number;
  forceFresh?: boolean;
};

export type PlaceDetailsOptions = {
  placeId: string;
  fieldMask?: string;
  forceFresh?: boolean;
};

export type PlacePhotosOptions = {
  placeId: string;
  limit?: number;
  forceFresh?: boolean;
};

const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours for persistent cache

const getGoogleApiKey = () => {
  const key = process.env.GOOGLE_API_KEY ?? process.env.VITE_GOOGLE_API_KEY;
  if (!key) {
    throw new Error('Google Places API key is not configured');
  }
  return key;
};

const placesClient = google.places({
  version: 'v1',
  auth: getGoogleApiKey(),
});

// Field names without prefix (for Place Details API - single place response)
const FIELDS = {
  id: 'id',
  displayName: 'displayName',
  formattedAddress: 'formattedAddress',
  location: 'location',
  types: 'types',
  websiteUri: 'websiteUri',
  nationalPhoneNumber: 'nationalPhoneNumber',
  priceLevel: 'priceLevel',
  photos: 'photos',
  addressComponents: 'addressComponents',
} as const;

// Helper to add 'places.' prefix for search endpoints
const withPlacesPrefix = (fields: string[]) => fields.map((f) => `places.${f}`).join(',');

// For search endpoints (returns places array)
const DEFAULT_SEARCH_FIELD_MASK = withPlacesPrefix([
  FIELDS.id,
  FIELDS.displayName,
  FIELDS.formattedAddress,
  FIELDS.location,
  FIELDS.types,
]);

// For place details endpoint (returns single place)
const DEFAULT_DETAILS_FIELD_MASK = [
  FIELDS.id,
  FIELDS.displayName,
  FIELDS.formattedAddress,
  FIELDS.location,
  FIELDS.types,
  FIELDS.websiteUri,
  FIELDS.nationalPhoneNumber,
  FIELDS.priceLevel,
  FIELDS.photos,
].join(',');

const buildCacheKey = (parts: Record<string, unknown>) => {
  return `google-places:${JSON.stringify(parts)}`;
};

const readCache = async <T>(key: string | undefined): Promise<T | null> => {
  if (!key) {
    return null;
  }
  try {
    const data = await redis.get(key);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as T;
  } catch (err) {
    logger.error('Failed to read from Redis cache', { key, error: String(err) });
    return null;
  }
};

const writeCache = async <T>(key: string | undefined, value: T, ttlMs = DEFAULT_CACHE_TTL_MS) => {
  if (!key) {
    return;
  }
  try {
    const seconds = Math.floor(ttlMs / 1000);
    await redis.setex(key, seconds, JSON.stringify(value));
  } catch (err) {
    logger.error('Failed to write to Redis cache', { key, error: String(err) });
  }
};

export const getPlaceDetails = async ({
  placeId,
  fieldMask = DEFAULT_DETAILS_FIELD_MASK,
  forceFresh,
}: PlaceDetailsOptions): Promise<GooglePlaceDetailsResponse> => {
  const cacheKey = buildCacheKey({
    path: 'places-details',
    placeId,
    fieldMask,
  });

  const cached = !forceFresh ? await readCache<GooglePlaceDetailsResponse>(cacheKey) : null;
  if (cached) {
    return cached;
  }

  const response = await placesClient.places.get({
    name: `places/${placeId}`,
    headers: {
      'X-Goog-FieldMask': fieldMask,
    },
  });

  const data = response.data;
  if (!data) {
    throw new Error(`Place ${placeId} not found`);
  }

  await writeCache(cacheKey, data);
  return data;
};

export const searchPlaces = async ({
  query,
  locationBias,
  fieldMask = DEFAULT_SEARCH_FIELD_MASK,
  maxResultCount = 10,
  forceFresh,
}: SearchPlacesOptions): Promise<GooglePlacesApiResponse[]> => {
  const body: places_v1.Schema$GoogleMapsPlacesV1SearchTextRequest = {
    textQuery: query,
    maxResultCount,
  };

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: locationBias.latitude,
          longitude: locationBias.longitude,
        },
        radius: locationBias.radius,
      },
    };
  }

  const cacheKey = buildCacheKey({
    path: 'search',
    query,
    locationBias,
    fieldMask,
    maxResultCount,
  });

  const cached = !forceFresh ? await readCache<GooglePlacesApiResponse[]>(cacheKey) : null;
  if (cached) {
    return cached;
  }

  const response = await placesClient.places.searchText({
    requestBody: body,
    headers: {
      'X-Goog-FieldMask': fieldMask,
    },
  });

  const places = response.data.places ?? [];
  await writeCache(cacheKey, places);
  return places;
};

export const getPlacePhotos = async ({
  placeId,
  limit = 6,
  forceFresh,
}: PlacePhotosOptions): Promise<string[]> => {
  const details = await getPlaceDetails({
    placeId,
    fieldMask: FIELDS.photos,
    forceFresh,
  });

  const photos = details.photos ?? [];
  return photos
    .map((photo) => photo.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .slice(0, limit);
};

export const getNeighborhoodFromAddressComponents = (
  addressComponents: GooglePlaceDetailsResponse['addressComponents'],
) => {
  if (!addressComponents) {
    return null;
  }
  const neighborhood = addressComponents.find((component) =>
    component.types?.includes('neighborhood'),
  );
  return neighborhood ? neighborhood.longText : null;
};

export const googlePlacesTestUtils = {
  clearCache: async () => {
    const keys = await redis.keys('google-places:*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};
