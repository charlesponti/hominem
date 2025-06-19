import type { PlaceInsert } from '@hominem/utils/types'
import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { searchPlaces } from '../lib/google/places.js'

const SearchPlacesQuerySchema = z.object({
  query: z.string().min(1),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radius: z.coerce.number().positive(),
})

export const placesSearchRoutes = new Hono()

// Search for places using Google Places API
placesSearchRoutes.get('/', zValidator('query', SearchPlacesQuerySchema), async (c) => {
  const { query, latitude, longitude, radius } = c.req.valid('query')

  try {
    const rawPlacesResult = await searchPlaces({
      query,
      center: { latitude, longitude },
      radius,
      fields: [
        'places.id',
        'places.adrFormatAddress',
        'places.displayName',
        'places.location',
        'places.internationalPhoneNumber',
        'places.types',
        'places.websiteUri',
      ],
    })

    const searchResults = rawPlacesResult.map((p: PlaceInsert) => ({
      googleMapsId: p.googleMapsId,
      name: p.name,
      address: p.address,
      location: p.location, // p.location is already [longitude, latitude]
      types: p.types,
      imageUrl: p.imageUrl, // This will be null as per PlaceInsert definition from googlePlaceToPlaceInsert
      websiteUri: p.websiteUri,
      phoneNumber: p.phoneNumber,
    }))

    return c.json(searchResults)
  } catch (error) {
    console.error('Could not fetch places:', error)
    return c.json({ error: 'Failed to fetch places' }, 500)
  }
})
