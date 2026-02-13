import { env } from '@hominem/services/env';
import { redis } from '@hominem/services/redis';
import { logger } from '@hominem/utils/logger';

// Minimal types to avoid loading heavy googleapis type system
type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

type GooglePlacesClient = {
  places: {
    get: (params: { name: string }, options: { headers: Record<string, string> }) => Promise<{
      data: GooglePlaceDetailsResponse;
    }>;
    searchText: (
      params: { requestBody: Record<string, JsonValue> },
      options: { headers: Record<string, string> },
    ) => Promise<{ data: { places?: GooglePlaceDetailsResponse[] } }>;
    autocomplete: (
      params: { requestBody: Record<string, JsonValue> },
      options: { headers: Record<string, string> },
    ) => Promise<{ data: { suggestions?: GooglePlacePrediction[] } }>;
    photos: {
      getMedia: (params: {
        name: string;
        maxWidthPx?: number;
        maxHeightPx?: number;
        skipHttpRedirect?: boolean;
      }) => Promise<{ data: { photoUri?: string | null } }>;
    };
  };
};

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

export type AutocompleteOptions = {
  input: string;
  sessionToken?: string;
  locationBias?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  includeQueryPredictions?: boolean;
  includedPrimaryTypes?: string[];
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
  placePrediction?: {
    placeId?: string | null;
    text?: { text?: string | null } | null;
    structuredFormat?: {
      mainText?: { text?: string | null } | null;
      secondaryText?: { text?: string | null } | null;
    } | null;
    displayName?: { text?: string | null } | null;
    formattedAddress?: string | null;
    id?: string | null;
  } | null;
};

export type GooglePlacesApiResponse = {
  places?: GooglePlaceDetailsResponse[];
};

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

export type GoogleAddressComponent = {
  types?: string[];
  longText?: string | null;
};

export type GooglePlacePhoto = {
  name?: string | null;
};

export type GooglePlaceDetailsResponse = {
  id?: string;
  displayName?: { text?: string | null } | null;
  formattedAddress?: string | null;
  location?: { latitude?: number | null; longitude?: number | null } | null;
  types?: string[] | null;
  websiteUri?: string | null;
  nationalPhoneNumber?: string | null;
  priceLevel?: string | number | null;
  rating?: number | null;
  photos?: GooglePlacePhoto[] | null;
  addressComponents?: GoogleAddressComponent[] | null;
};

const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours for persistent cache

const getGoogleApiKey = () => {
  const key = env.GOOGLE_API_KEY ?? env.VITE_GOOGLE_API_KEY;
  if (!key) {
    throw new Error('Google Places API key is not configured');
  }
  return key;
};

// Cache the client instance once the API key is available
let cachedPlacesClient: GooglePlacesClient | undefined;

const createPlacesClient = (): GooglePlacesClient => {
  if (cachedPlacesClient) {
    return cachedPlacesClient;
  }

  // Type system avoids googleapis imports to prevent type graph construction
  const google = require('googleapis').google;

  const placesClient = google.places({
    version: 'v1',
    auth: getGoogleApiKey(),
  });
  cachedPlacesClient = placesClient;
  return placesClient;
};

// Field names without prefix (for PlaceOutput Details API - single place response)
const FIELDS = {
  id: 'id',
  displayName: 'displayName',
  formattedAddress: 'formattedAddress',
  location: 'location',
  types: 'types',
  websiteUri: 'websiteUri',
  nationalPhoneNumber: 'nationalPhoneNumber',
  priceLevel: 'priceLevel',
  rating: 'rating',
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

const DEFAULT_AUTOCOMPLETE_FIELD_MASK =
  'suggestions.placePrediction.placeId,suggestions.placePrediction.text,' +
  'suggestions.placePrediction.structuredFormat,' +
  'suggestions.placePrediction.types,suggestions.placePrediction.distanceMeters';

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
  FIELDS.rating,
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

  const response = await createPlacesClient().places.get(
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
}: SearchPlacesOptions): Promise<GooglePlaceDetailsResponse[]> => {
  const body: Record<string, JsonValue> = {
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

  const cached = !forceFresh ? await readCache<GooglePlaceDetailsResponse[]>(cacheKey) : null;
  if (cached) {
    return cached;
  }

  const response = await createPlacesClient().places.searchText(
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

const autocomplete = async ({
  input,
  sessionToken,
  locationBias,
  includeQueryPredictions,
  includedPrimaryTypes,
}: AutocompleteOptions): Promise<GooglePlacePrediction[]> => {
  const body: Record<string, JsonValue> = { input };

  if (sessionToken) {
    body.sessionToken = sessionToken;
  }

  if (includeQueryPredictions !== undefined) {
    body.includeQueryPredictions = includeQueryPredictions;
  }

  if (includedPrimaryTypes) {
    body.includedPrimaryTypes = includedPrimaryTypes;
  }

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

  // Autocomplete responses are session-scoped; avoid caching.
  const response = await createPlacesClient().places.autocomplete(
    { requestBody: body },
    { headers: { 'X-Goog-FieldMask': DEFAULT_AUTOCOMPLETE_FIELD_MASK } },
  );

  return response.data.suggestions ?? [];
};

const getPhotos = async ({
  placeId,
  limit = 6,
  forceFresh,
}: PlacePhotosOptions): Promise<string[]> => {
  const detailsParams = {
    placeId,
    fieldMask: FIELDS.photos,
  } as const;
  const details = await getDetails(forceFresh ? { ...detailsParams, forceFresh } : detailsParams);

  const photos = details.photos ?? [];
  return photos
    .map((photo: GooglePlacePhoto) => photo.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .slice(0, limit);
};

const getPhotoMediaUrl = async (photoResourceName: string): Promise<string | null> => {
  try {
    const name = photoResourceName.endsWith('/media')
      ? photoResourceName
      : `${photoResourceName}/media`;

    const response = await createPlacesClient().places.photos.getMedia({
      name,
      maxWidthPx: 1600,
      maxHeightPx: 1200,
      skipHttpRedirect: true,
    });

    return response.data.photoUri ?? null;
  } catch (err) {
    logger.error('Failed to get photo media URL', {
      photoResourceName,
      error: String(err),
    });
    return null;
  }
};

export const googlePlaces = {
  getDetails,
  search,
  autocomplete,
  getPhotos,
  getPhotoMediaUrl,
};

export const getNeighborhoodFromAddressComponents = (
  addressComponents: GooglePlaceDetailsResponse['addressComponents'],
) => {
  if (!addressComponents) {
    return null;
  }
  const neighborhood = addressComponents.find((component: GoogleAddressComponent) =>
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
  setClient: (client: GooglePlacesClient | undefined) => {
    cachedPlacesClient = client;
  },
};
