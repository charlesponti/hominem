import type { PlaceInsert } from '@hominem/data/places';
import type {
  GooglePlaceDetailsResponse,
  GooglePlacePrediction,
  GooglePlacesApiResponse,
} from '~/lib/types';
import { sanitizeStoredPhotos } from '@hominem/utils/images';
import { logger } from './logger';

function toLocationTuple(latitude?: number | null, longitude?: number | null): [number, number] {
  return latitude != null && longitude != null ? [longitude, latitude] : [0, 0];
}

/**
 * Transforms Google Places API response to database PlaceInsert format
 */
export const transformGooglePlaceToPlaceInsert = (
  googlePlace: GooglePlaceDetailsResponse,
  googleMapsId: string,
): PlaceInsert => {
  const rawPhotos = extractPhotoReferences(googlePlace.photos);
  const fetchedPhotos = sanitizeStoredPhotos(rawPhotos);
  const latitude = googlePlace.location?.latitude ?? null;
  const longitude = googlePlace.location?.longitude ?? null;

  const result: PlaceInsert = {
    googleMapsId,
    name: googlePlace.displayName?.text || 'Unknown Place',
    address: googlePlace.formattedAddress ?? null,
    latitude,
    longitude,
    location: toLocationTuple(latitude, longitude),
    types: googlePlace.types ?? null,
    rating: googlePlace.rating ?? null,
    websiteUri: googlePlace.websiteUri ?? null,
    phoneNumber: googlePlace.nationalPhoneNumber ?? null,
    priceLevel: parsePriceLevel(googlePlace.priceLevel),
    photos: fetchedPhotos.length > 0 ? fetchedPhotos : null,
    imageUrl: null, // Will be computed from photos if needed
  };

  logger.info('Transformed Google Place to DB insert', {
    googleMapsId,
    name: result.name,
    photosCount: fetchedPhotos.length,
  });

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
  place_id: placeResult.id,
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
