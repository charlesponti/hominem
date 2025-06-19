import { formatGeocodeFeatures, type Geocoding, LAYERS } from '@hominem/utils/location'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'

export const locationRoutes = new Hono()

const geocodeQuerySchema = z.object({
  query: z.string().min(1, 'Query parameter is required'),
})

// Geocode endpoint
locationRoutes.get('/geocode', zValidator('query', geocodeQuerySchema), async (c) => {
  try {
    const { query } = c.req.valid('query')

    const { GEOCODE_EARTH_API_KEY } = process.env

    if (!GEOCODE_EARTH_API_KEY) {
      console.error('Missing GEOCODE_EARTH_API_KEY environment variable')
      return c.json({ error: 'Geocoding service not configured' }, 500)
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
      return c.json({ error: 'Error fetching location data' }, 500)
    }

    const results = (await response.json()) as Geocoding

    return c.json(formatGeocodeFeatures(results))
  } catch (error) {
    console.error('Error fetching city lat/lng:', error)
    return c.json(
      {
        error: 'Error fetching city lat/lng',
        details: error instanceof Error ? error.message : String(error),
      },
      500
    )
  }
})
