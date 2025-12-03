import type {
  GooglePlaceDetailsResponse,
  GooglePlacePrediction,
  GooglePlacesApiResponse,
} from '~/lib/types'

export const extractPhotoReferences = (photos: GooglePlaceDetailsResponse['photos']): string[] => {
  if (!photos) {
    return []
  }

  return photos
    .map((photo) => photo.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
}

export const sanitizeStoredPhotos = (photos: string[] | null | undefined): string[] => {
  if (!Array.isArray(photos)) {
    return []
  }

  return photos.filter((photo): photo is string => typeof photo === 'string' && photo.length > 0)
}

/**
 * Converts Google Places API price level string to a numeric value.
 * Google returns strings like "PRICE_LEVEL_MODERATE", but we store integers in the database.
 */
export const parsePriceLevel = (priceLevel: string | number | null | undefined): number | null => {
  if (priceLevel === null || priceLevel === undefined) {
    return null
  }

  // If it's already a number, return it
  if (typeof priceLevel === 'number') {
    return priceLevel
  }

  const priceLevelMap: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  }

  return priceLevelMap[priceLevel] ?? null
}

export const mapGooglePlaceToPrediction = (
  placeResult: GooglePlacesApiResponse
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
})
