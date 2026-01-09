import { z } from 'zod'
import { searchPlaces as googleSearchPlaces } from '~/lib/google-places.server'
import { mapGooglePlaceToPrediction } from '~/lib/places-utils'
import { logger } from '../../logger'
import { protectedProcedure } from '../context'

export const autocomplete = protectedProcedure
  .input(
    z.object({
      query: z.string().min(2),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      // optional radius in meters to control location bias for results
      radius: z.number().optional().default(50000),
    })
  )
  .query(async ({ input }) => {
    const query = input.query.trim()
    if (query.length < 2) {
      return []
    }

    let locationBias: { latitude: number; longitude: number; radius: number } | undefined

    try {
      locationBias =
        typeof input.latitude === 'number' && typeof input.longitude === 'number'
          ? {
              latitude: input.latitude,
              longitude: input.longitude,
              radius: input.radius ?? 50000,
            }
          : undefined

      const googleResults = await googleSearchPlaces({
        query,
        maxResultCount: 8,
        locationBias,
      })

      const predictions = googleResults.map(mapGooglePlaceToPrediction)
      return predictions
    } catch (error) {
      logger.error('Failed to autocomplete places', {
        service: 'placesRouter',
        function: 'autocomplete',
        error: error instanceof Error ? error.message : String(error),
        query,
        locationBias,
      })
      throw new Error('Failed to fetch autocomplete suggestions')
    }
  })
