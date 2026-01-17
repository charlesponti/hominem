import { logger } from '@hominem/utils/logger';
import { redis } from '../redis';
import { google, type places_v1 } from 'googleapis';

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

// Types extracted from rocco/app/lib/types.ts
export type PlaceLocation = {
  latitude: number;
  longitude: number;
  id?: string;
  name?: string;
  imageUrl?: string | null;
};

export type GooglePlacePrediction = {
  place_id: string;
  text: string;
  address: string;
  location: PlaceLocation | null;
  priceLevel?: string | number | null;
};

export type GooglePlacesApiResponse = places_v1.Schema$GoogleMapsPlacesV1Place;

export type GooglePlaceData = {
  id: string;
  googleMapsId: string | null;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  types: string[] | null;
  imageUrl: string | null;
  phoneNumber: string | null;
  rating: number | null;
  websiteUri: string | null;
  bestFor: string | null;
  wifiInfo: string | null;
  photos?: string[] | null;
  priceLevel?: number | null;
};

export type GoogleAddressComponent = places_v1.Schema$GoogleMapsPlacesV1PlaceAddressComponent;
export type GooglePlacePhoto = places_v1.Schema$GoogleMapsPlacesV1Photo;
export type GooglePlaceDetailsResponse = places_v1.Schema$GoogleMapsPlacesV1Place;
import { env } from '../env';

const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours for persistent cache

const getGoogleApiKey = () => {
  const key = env.GOOGLE_API_KEY ?? env.VITE_GOOGLE_API_KEY;
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

const getDetails = async ({
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

  const response = await placesClient.places.get(
    {
      name: `places/${placeId}`,
    },
    {
      headers: {
        'X-Goog-FieldMask': fieldMask,
      },
    },
  );

  const data = response.data;
  if (!data) {
    throw new Error(`Place ${placeId} not found`);
  }

  await writeCache(cacheKey, data);
  return data;
};

const search = async ({
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

  const response = await placesClient.places.searchText(
    {
      requestBody: body,
    },
    {
      headers: {
        'X-Goog-FieldMask': fieldMask,
      },
    },
  );

  const places = response.data.places ?? [];
  await writeCache(cacheKey, places);
  return places;
};

const getPhotos = async ({
  placeId,
  limit = 6,
  forceFresh,
}: PlacePhotosOptions): Promise<string[]> => {
  const details = await getDetails({
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

export const googlePlaces = {
  getDetails,
  search,
  getPhotos,
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
