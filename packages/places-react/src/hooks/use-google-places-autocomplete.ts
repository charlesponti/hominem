import type { PlaceAutocompleteOutput } from '@hominem/rpc/types/places.types';

import { usePlacesAutocomplete } from './use-places';

export type GooglePlacePrediction = PlaceAutocompleteOutput[number];

interface UseGooglePlacesAutocompleteOptions {
  input: string;
  location?: { latitude: number; longitude: number } | undefined;
  radiusMeters?: number;
  sessionToken?: string;
}

export function useGooglePlacesAutocomplete({
  input,
  location,
}: UseGooglePlacesAutocompleteOptions) {
  const trimmed = input.trim();
  return usePlacesAutocomplete(trimmed, location?.latitude, location?.longitude);
}
