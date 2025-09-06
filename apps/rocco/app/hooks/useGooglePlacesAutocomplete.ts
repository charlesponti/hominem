import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { PlaceLocation } from '~/lib/types'

const GOOGLE_PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText'

export interface GooglePlacePrediction {
  description: string
  place_id: string // Added back
  structured_formatting: {
    main_text: string
    secondary_text: string
  }
  location: PlaceLocation | null
  priceLevel?: string
}

interface GooglePlaceApiResponse {
  displayName?: {
    text?: string
  }
  id: string
  formattedAddress?: string
  location?: PlaceLocation
  priceLevel?: string
}

export interface UseGooglePlacesAutocompleteOptions {
  input: string
}

export function useGooglePlacesAutocomplete({ input }: UseGooglePlacesAutocompleteOptions) {
  const fetchPredictions = useCallback(async () => {
    if (!input || input.length < 3) return []
    const response = await fetch(GOOGLE_PLACES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': import.meta.env.VITE_GOOGLE_API_KEY,
        'X-Goog-FieldMask':
          'places.displayName,places.formattedAddress,places.priceLevel,places.id,places.location',
      },
      body: JSON.stringify({ textQuery: input }),
    })

    if (!response.ok) {
      console.error('Google Places API request failed:', response.status)
      return []
    }

    const data = await response.json()

    if (!data.places || !Array.isArray(data.places)) {
      return []
    }

    return data.places.map((place: GooglePlaceApiResponse) => ({
      description: place.displayName?.text ?? '',
      place_id: place.id, // Added mapping for place_id
      structured_formatting: {
        main_text: place.displayName?.text ?? '',
        secondary_text: place.formattedAddress ?? '',
      },
      location: place.location,
      priceLevel: place.priceLevel,
    })) as GooglePlacePrediction[]
  }, [input])

  return useQuery<GooglePlacePrediction[], Error>({
    queryKey: ['google-places-autocomplete', input],
    queryFn: () => {
      if (!input || input.length < 3) return Promise.resolve([])
      return fetchPredictions()
    },
    enabled: !!input && input.length >= 3,
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
  })
}
