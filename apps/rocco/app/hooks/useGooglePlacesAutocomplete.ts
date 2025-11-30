import { trpc } from '~/lib/trpc/client'

export type { GooglePlacePrediction } from '~/lib/types'

export interface UseGooglePlacesAutocompleteOptions {
  input: string
}

export function useGooglePlacesAutocomplete({ input }: UseGooglePlacesAutocompleteOptions) {
  const trimmed = input.trim()
  const enabled = trimmed.length >= 3

  return trpc.places.autocomplete.useQuery(
    { query: trimmed },
    {
      enabled,
      staleTime: 1000 * 60,
      retry: 1,
    }
  )
}
