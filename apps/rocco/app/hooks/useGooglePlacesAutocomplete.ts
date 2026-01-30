import { usePlacesAutocomplete } from '../lib/hooks/use-places';

export type { GooglePlacePrediction } from '~/lib/types';

export interface UseGooglePlacesAutocompleteOptions {
  input: string;
  location?: { latitude: number; longitude: number };
}

export function useGooglePlacesAutocomplete({
  input,
  location,
}: UseGooglePlacesAutocompleteOptions) {
  const trimmed = input.trim();

  return usePlacesAutocomplete(trimmed, location?.latitude, location?.longitude);
}
