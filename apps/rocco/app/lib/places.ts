/**
 * Places utility hooks and helpers
 *
 * These are re-exports and wrappers around the core API hooks
 * defined in ~/lib/api/hooks/use-places.ts
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
  useLogPlaceVisit,
  useMyVisits,
  usePlaceVisits,
  useUpdatePlaceVisit,
  useDeletePlaceVisit,
  usePlaceVisitStats,
} from './hooks/use-places';

export { useRemoveItemFromList } from './hooks/use-items';

// Aliases for backward compatibility
export { useAddPlaceToLists as useAddPlaceToList } from './hooks/use-places';
export { useRemovePlaceFromList as useRemoveListItem } from './hooks/use-places';
export { useLogPlaceVisit as useLogVisit } from './hooks/use-places';
export { useUpdatePlaceVisit as useUpdateVisit } from './hooks/use-places';
export { useDeletePlaceVisit as useDeleteVisit } from './hooks/use-places';
export { usePlaceVisitStats as useVisitStats } from './hooks/use-places';

export async function createPlaceFromPrediction(prediction: GooglePlacePrediction): Promise<Place> {
  /**
   * NOTE: Do not fetch photos here to avoid double fetching.
   * The photos will be fetched when the user navigates to the place details page.
   */
  const photoUrls: string[] = [];

  const latitude = prediction.location?.latitude ?? null;
  const longitude = prediction.location?.longitude ?? null;

  return {
    id: prediction.place_id,
    name: prediction.text || '',
    description: null,
    address: prediction.address || null,
    createdAt: '',
    updatedAt: '',
    googleMapsId: prediction.place_id,
    types: null,
    imageUrl: null,
    phoneNumber: null,
    rating: null,
    websiteUri: null,
    latitude,
    longitude,
    photos: photoUrls.length > 0 ? photoUrls : null,
    priceLevel: null,
    businessStatus: null,
    openingHours: null,
  };
}
