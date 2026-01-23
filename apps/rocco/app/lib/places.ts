/**
 * Places utility hooks and helpers
 *
 * These are re-exports and wrappers around the core Hono hooks
 * defined in ~/lib/hono/hooks/use-places.ts
 */

import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete';

import type { Place } from './types';

export {
  useCreatePlace,
  useUpdatePlace,
  useDeletePlace,
  usePlacesAutocomplete,
  usePlaceById,
  usePlaceByGoogleId,
  useAddPlaceToLists,
  useRemovePlaceFromList,
  useNearbyPlaces,
  useLogVisit,
  useMyVisits,
  usePlaceVisits,
  useUpdateVisit,
  useDeleteVisit,
  useVisitStats,
} from '~/lib/hono';

export { useRemoveItemFromList } from '~/lib/hono';

// Aliases for backward compatibility
export { useAddPlaceToLists as useAddPlaceToList } from '~/lib/hono';
export { useRemovePlaceFromList as useRemoveListItem } from '~/lib/hono';

export async function createPlaceFromPrediction(prediction: GooglePlacePrediction): Promise<Place> {
  /**
   * NOTE: Do not fetch photos here to avoid double fetching.
   * The photos will be fetched when the user navigates to the place details page.
   */
  const photoUrls: string[] = [];

  const latitude = prediction.location?.latitude || null;
  const longitude = prediction.location?.longitude || null;
  const location: [number, number] = latitude && longitude ? [longitude, latitude] : [0, 0];

  return {
    id: prediction.place_id,
    name: prediction.text || '',
    description: null,
    address: prediction.address || '',
    createdAt: '',
    updatedAt: '',
    itemId: null,
    googleMapsId: prediction.place_id,
    types: null,
    imageUrl: null,
    phoneNumber: null,
    rating: null,
    websiteUri: null,
    latitude,
    longitude,
    location,
    bestFor: null,
    isPublic: false,
    wifiInfo: null,
    photos: photoUrls,
    priceLevel: null,
    businessStatus: null,
    openingHours: null,
    associatedLists: [],
    thumbnailPhotos: [],
    fullPhotos: [],
  };
}
