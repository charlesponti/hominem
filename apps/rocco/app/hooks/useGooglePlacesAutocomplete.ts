import { usePlacesAutocomplete } from '../lib/hooks/use-places';

export type { GooglePlacePrediction } from '~/lib/types';

export interface UseGooglePlacesAutocompleteOptions {
  input: string;
  location?: { latitude: number; longitude: number } | undefined;
  radiusMeters?: number;
  sessionToken?: string;
}

export function useGooglePlacesAutocomplete({
  input,
  location,
  radiusMeters,
  sessionToken,
}: UseGooglePlacesAutocompleteOptions) {
  const trimmed = input.trim();

  const rpcParams: {
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    sessionToken?: string;
  } = {};

  if (typeof location?.latitude === 'number') {
    rpcParams.latitude = location.latitude;
  }
  if (typeof location?.longitude === 'number') {
    rpcParams.longitude = location.longitude;
  }
  if (typeof radiusMeters === 'number') {
    rpcParams.radiusMeters = radiusMeters;
  }
  if (sessionToken) {
    rpcParams.sessionToken = sessionToken;
  }

  return usePlacesAutocomplete(trimmed, rpcParams.latitude, rpcParams.longitude);
}
