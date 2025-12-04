import { trpc } from '~/lib/trpc/client'

export type { GooglePlacePrediction } from '~/lib/types'

export interface UseGooglePlacesAutocompleteOptions {
  input: string
  location?: { latitude: number; longitude: number }
}

export function useGooglePlacesAutocomplete({ input, location }: UseGooglePlacesAutocompleteOptions) {
  const trimmed = input.trim()
  const enabled = trimmed.length >= 3

  return trpc.places.autocomplete.useQuery(
    location
      ? { query: trimmed, latitude: location.latitude, longitude: location.longitude }
      : { query: trimmed },
    {
      enabled,
      staleTime: 1000 * 60,
      retry: 1,
    }
  )
}
