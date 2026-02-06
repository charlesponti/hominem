import type { PlaceCreateInput } from '@hominem/hono-rpc/types/places.types';

import { getHominemPhotoURL, sanitizeStoredPhotos } from '@hominem/utils/images';

import type {
  GooglePlaceDetailsResponse,
  GooglePlacePrediction,
  GooglePlacesApiResponse,
} from '~/lib/shared-types';

export const getPlacePhotoUrl = (reference: string | null | undefined) => {
  if (!reference) return null;
  return getHominemPhotoURL(reference);
};

/**
 * Transforms Google Places API response to API PlaceCreateInput format
 */
export const transformGooglePlaceToPlaceInsert = (
  googlePlace: GooglePlaceDetailsResponse,
  googleMapsId: string,
): PlaceCreateInput => {
  const rawPhotos = extractPhotoReferences(googlePlace.photos);
  const fetchedPhotos = sanitizeStoredPhotos(rawPhotos);
  const latitude = googlePlace.location?.latitude ?? null;
  const longitude = googlePlace.location?.longitude ?? null;

  // Build result object conditionally to satisfy exactOptionalPropertyTypes
  const result: PlaceCreateInput = {
    googleMapsId,
    name: googlePlace.displayName?.text || 'Unknown Place',
  };

  // Only add optional properties if they have values
  if (googlePlace.formattedAddress) {
    result.address = googlePlace.formattedAddress;
  }
  if (latitude != null) {
    result.latitude = latitude;
  }
  if (longitude != null) {
    result.longitude = longitude;
  }
  if (googlePlace.rating != null) {
    result.rating = googlePlace.rating;
  }
  if (googlePlace.websiteUri) {
    result.websiteUri = googlePlace.websiteUri;
  }
  if (googlePlace.nationalPhoneNumber) {
    result.phoneNumber = googlePlace.nationalPhoneNumber;
  }
  const parsedPriceLevel = parsePriceLevel(googlePlace.priceLevel);
  if (parsedPriceLevel != null) {
    result.priceLevel = parsedPriceLevel;
  }
  if (fetchedPhotos.length > 0) {
    result.photos = fetchedPhotos;
  }

  return result;
};

export const extractPhotoReferences = (photos: GooglePlaceDetailsResponse['photos']) => {
  if (!photos) {
    return [];
  }

  return photos
    .map((photo) => photo.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0);
};

/**
 * Converts Google Places API price level string to a numeric value.
 * Google returns strings like "PRICE_LEVEL_MODERATE", but we store integers in the database.
 */
export const parsePriceLevel = (priceLevel: string | number | null | undefined) => {
  if (priceLevel === null || priceLevel === undefined) {
    return null;
  }

  // If it's already a number, return it
  if (typeof priceLevel === 'number') {
    return priceLevel;
  }

  const priceLevelMap: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };

  return priceLevelMap[priceLevel] ?? null;
};

export const mapGooglePlaceToPrediction = (
  placeResult: GooglePlacesApiResponse,
): GooglePlacePrediction => ({
  place_id: placeResult.id ?? '',
  text: placeResult.displayName?.text ?? '',
  address: placeResult.formattedAddress ?? '',
  location:
    placeResult.location &&
    typeof placeResult.location.latitude === 'number' &&
    typeof placeResult.location.longitude === 'number'
      ? {
          latitude: placeResult.location.latitude,
          longitude: placeResult.location.longitude,
        }
      : null,
  priceLevel: placeResult.priceLevel,
});
