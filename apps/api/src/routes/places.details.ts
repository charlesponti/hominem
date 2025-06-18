import { db } from '@hominem/utils/db'
import { item as itemTable, place as placesTable } from '@hominem/utils/schema'
import type { Place as DbPlaceSchema } from '@hominem/utils/types'
import { zValidator } from '@hono/zod-validator'
import { and, eq, or } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import type { PhotoMedia } from '../plugins/google/places.js'
import { getPlaceDetails, getPlacePhotos } from '../plugins/google/places.js'
import { normalizePlaceForResponse, type NormalizedListInfo } from './places.utils.js'

const PlaceIdParamSchema = z.object({
  id: z.string().min(1),
})

export const placesDetailsRoutes = new Hono()

// Get place details by ID (Google Maps ID or DB ID)
placesDetailsRoutes.get('/:id', requireAuth, zValidator('param', PlaceIdParamSchema), async (c) => {
  const { id: googleMapsIdOrDbId } = c.req.valid('param')
  const userId = c.get('userId')

  let dbPlace: DbPlaceSchema | null | undefined = null
  let associatedLists: NormalizedListInfo[] = []
  let photos: PhotoMedia[] = []

  try {
    dbPlace = await db.query.place.findFirst({
      where: or(
        eq(placesTable.id, googleMapsIdOrDbId),
        eq(placesTable.googleMapsId, googleMapsIdOrDbId)
      ),
    })

    if (!dbPlace) {
      // If not in DB, fetch from Google and insert
      const googlePlace = await getPlaceDetails({ placeId: googleMapsIdOrDbId })
      const [insertedPlace] = await db.insert(placesTable).values(googlePlace).returning()
      dbPlace = insertedPlace
    }

    const itemsLinkingToThisPlace = await db.query.item.findMany({
      where: and(eq(itemTable.itemId, dbPlace.id), eq(itemTable.itemType, 'PLACE')),
      with: {
        list: {
          columns: { id: true, name: true },
        },
      },
    })

    associatedLists = itemsLinkingToThisPlace
      .map((itemRecord) => itemRecord.list)
      .filter(
        (listRecord): listRecord is { id: string; name: string } =>
          listRecord !== null && listRecord !== undefined
      )
      .map((listRecord) => ({ id: listRecord.id, name: listRecord.name }))

    photos = (await getPlacePhotos({ googleMapsId: dbPlace.googleMapsId })) ?? []
  } catch (error) {
    console.error('Error fetching place details by ID:', error, { googleMapsIdOrDbId })
    return c.json({ error: 'Failed to fetch place details' }, 500)
  }

  if (!dbPlace) {
    return c.json({ message: 'Place not found after all checks' }, 404)
  }

  const normalizedPlace = normalizePlaceForResponse(dbPlace, associatedLists, photos)
  return c.json(normalizedPlace)
})
