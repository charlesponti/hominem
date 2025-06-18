import { db } from '@hominem/utils/db'
import { item as itemTable, place as placesTable } from '@hominem/utils/schema'
import type { Place as DbPlaceSchema, ItemInsert, PlaceInsert } from '@hominem/utils/types'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import crypto from 'node:crypto'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import type { PhotoMedia } from '../plugins/google/places.js'
import { getPlacePhotos } from '../plugins/google/places.js'
import { normalizePlaceForResponse, type NormalizedListInfo } from './places.utils.js'

const AddPlaceToListsBodySchema = z.object({
  listIds: z.array(z.string().uuid()),
  place: z.object({
    googleMapsId: z.string(),
    name: z.string(),
    address: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    types: z.array(z.string()),
    imageUrl: z.string().optional().nullable(),
    websiteUri: z.string().optional().nullable(),
    phoneNumber: z.string().optional().nullable(),
  }),
})

export const placesAddToListsRoutes = new Hono()

// Add place to multiple lists
placesAddToListsRoutes.post(
  '/',
  requireAuth,
  zValidator('json', AddPlaceToListsBodySchema),
  async (c) => {
    const userId = c.get('userId')
    if (!userId) {
      return c.json({ error: 'Unauthorized: User ID is missing' }, 401)
    }

    const { listIds, place: placeInput } = c.req.valid('json')

    let finalPlace: DbPlaceSchema
    let affectedLists: NormalizedListInfo[] = []

    try {
      const existingPlace = await db.query.place.findFirst({
        where: eq(placesTable.googleMapsId, placeInput.googleMapsId),
      })

      if (existingPlace) {
        finalPlace = existingPlace
      } else {
        const newPlaceData: PlaceInsert = {
          userId: userId,
          name: placeInput.name,
          googleMapsId: placeInput.googleMapsId,
          address: placeInput.address,
          location: [placeInput.longitude, placeInput.latitude],
          latitude: placeInput.latitude,
          longitude: placeInput.longitude,
          types: placeInput.types,
          imageUrl: placeInput.imageUrl || null,
          websiteUri: placeInput.websiteUri || null,
          phoneNumber: placeInput.phoneNumber || null,
          description: null,
          bestFor: null,
          wifiInfo: null,
        }
        const [insertedPlace] = await db.insert(placesTable).values(newPlaceData).returning()
        finalPlace = insertedPlace
      }

      let fetchedPhotos: PhotoMedia[] = []
      fetchedPhotos = (await getPlacePhotos({ googleMapsId: finalPlace.googleMapsId })) ?? []

      const itemInsertValues: ItemInsert[] = listIds.map((listId) => ({
        listId,
        itemId: finalPlace.id,
        userId: userId,
        type: 'PLACE',
        id: crypto.randomUUID(),
      }))

      if (itemInsertValues.length > 0) {
        await db.insert(itemTable).values(itemInsertValues).onConflictDoNothing()
      }

      const itemsInLists = await db.query.item.findMany({
        where: and(eq(itemTable.itemId, finalPlace.id), eq(itemTable.itemType, 'PLACE')),
        with: {
          list: { columns: { id: true, name: true } },
        },
      })

      affectedLists = itemsInLists
        .map((item) => item.list)
        .filter((list) => list !== null && list !== undefined)
        .map((list) => ({ id: list.id, name: list.name }))

      const normalizedFinalPlace = normalizePlaceForResponse(
        finalPlace,
        affectedLists,
        fetchedPhotos
      )

      return c.json({ place: normalizedFinalPlace, lists: affectedLists })
    } catch (error) {
      console.error('Failed to add place to lists:', error, { userId, placeInput })
      return c.json({ error: 'Failed to process request' }, 500)
    }
  }
)
