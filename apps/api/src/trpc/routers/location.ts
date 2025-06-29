import { formatGeocodeFeatures, type Geocoding, LAYERS } from '@hominem/utils/location'
import { z } from 'zod'
import { protectedProcedure, router } from '../index'

export const locationRouter = router({
  // Geocode endpoint
  geocode: protectedProcedure
    .input(z.object({ query: z.string().min(1, 'Query parameter is required') }))
    .query(async ({ input }) => {
      try {
        const { query } = input

        const { GEOCODE_EARTH_API_KEY } = process.env

        if (!GEOCODE_EARTH_API_KEY) {
          console.error('Missing GEOCODE_EARTH_API_KEY environment variable')
          throw new Error('Geocoding service not configured')
        }

        const searchParams = new URLSearchParams({
          api_key: GEOCODE_EARTH_API_KEY,
          layers: LAYERS.join(','),
          'boundary.country': 'USA',
          text: query,
        })

        const response = await fetch(
          `https://api.geocode.earth/v1/autocomplete?${searchParams.toString()}`
        )

        if (!response.ok) {
          console.error(`Geocoding API error: ${response.status} ${response.statusText}`)
          throw new Error('Error fetching location data')
        }

        const results = (await response.json()) as Geocoding

        return formatGeocodeFeatures(results)
      } catch (error) {
        console.error('Error fetching city lat/lng:', error)
        throw new Error(
          `Error fetching city lat/lng: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }),
}) 
