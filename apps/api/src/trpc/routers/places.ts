import { db } from '@hominem/data'
import { item as itemTable, list as listTable, place as placesTable } from '@hominem/data/schema'
import type { Place as DbPlaceSchema, ItemInsert, PlaceInsert } from '@hominem/data/schema'
import { and, eq, or } from 'drizzle-orm'
import crypto from 'node:crypto'
import { z } from 'zod'
import type { PhotoMedia } from '../../lib/google/places.js'
import { getPlaceDetails, getPlacePhotos, searchPlaces } from '../../lib/google/places.js'
import { normalizePlaceForResponse, type NormalizedListInfo } from '../../lib/places.utils.js'
import { protectedProcedure, router } from '../index'

export const placesRouter = router({
  // Search for places using Google Places API
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number().positive(),
      })
    )
    .query(async ({ input }) => {
      const { query, latitude, longitude, radius } = input

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

        return searchResults
      } catch (error) {
        console.error('Could not fetch places:', error)
        throw new Error('Failed to fetch places')
      }
    }),

  // Get place details by ID (Google Maps ID or DB ID)
  getDetails: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const { id: googleMapsIdOrDbId } = input

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
        throw new Error('Failed to fetch place details')
      }

      if (!dbPlace) {
        throw new Error('Place not found after all checks')
      }

      const normalizedPlace = normalizePlaceForResponse(dbPlace, associatedLists, photos)
      return normalizedPlace
    }),

  // Add place to multiple lists
  addToLists: protectedProcedure
    .input(
      z.object({
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
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId
      const { listIds, place: placeInput } = input

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

        return { place: normalizedFinalPlace, lists: affectedLists }
      } catch (error) {
        console.error('Failed to add place to lists:', error, { userId, placeInput })
        throw new Error('Failed to process request')
      }
    }),

  // Remove place from a specific list
  removeFromList: protectedProcedure
    .input(
      z.object({
        listId: z.string().uuid(),
        placeId: z.string().uuid(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.userId
      const { listId, placeId: googleMapsIdOrDbId } = input

      try {
        const listAuthCheck = await db.query.list.findFirst({
          where: and(eq(listTable.id, listId), eq(listTable.userId, userId)),
        })

        if (!listAuthCheck) {
          throw new Error('Forbidden: You do not own this list.')
        }

        const placeToDelete = await db.query.place.findFirst({
          where: or(
            eq(placesTable.id, googleMapsIdOrDbId),
            eq(placesTable.googleMapsId, googleMapsIdOrDbId)
          ),
          columns: { id: true },
        })

        if (!placeToDelete) {
          throw new Error('Place not found in database.')
        }

        const internalPlaceId = placeToDelete.id

        const deletedItems = await db
          .delete(itemTable)
          .where(
            and(
              eq(itemTable.listId, listId),
              eq(itemTable.itemId, internalPlaceId),
              eq(itemTable.itemType, 'PLACE'),
              eq(itemTable.userId, userId)
            )
          )
          .returning({ id: itemTable.id })

        if (deletedItems.length === 0) {
          throw new Error(
            'Place not found in this list, or you do not have permission to remove it.'
          )
        }

        return { message: 'Place removed from list successfully' }
      } catch (error) {
        console.error('Error deleting place from list:', error, {
          userId,
          listId,
          googleMapsIdOrDbId,
        })
        throw new Error('Failed to delete place from list')
      }
    }),
})
