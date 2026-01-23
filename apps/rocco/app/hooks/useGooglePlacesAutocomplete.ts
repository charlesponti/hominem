import { usePlacesAutocomplete } from '~/lib/hono';

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
  const enabled = trimmed.length >= 3;

  return usePlacesAutocomplete(trimmed, location?.latitude, location?.longitude);
}
