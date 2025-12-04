import { item, list, place } from '@hominem/data'
import { and, eq, inArray, or, sql } from 'drizzle-orm'
import crypto from 'node:crypto'
import { z } from 'zod'
import {
  getPlaceDetails as fetchGooglePlaceDetails,
  getPlacePhotos as fetchGooglePlacePhotos,
  searchPlaces as googleSearchPlaces,
} from '~/lib/google-places.server'
import {
  extractPhotoReferences,
  mapGooglePlaceToPrediction,
  parsePriceLevel,
  sanitizeStoredPhotos,
} from '~/lib/places-utils'
import type { Place } from '~/lib/types'
import { type Context, protectedProcedure, publicProcedure, router } from '../context'

type ListSummary = {
  id: string
  name: string
}

const enrichPlaceWithDetails = async (ctx: Context, dbPlace: Place) => {
  const itemsLinkingToThisPlace = await ctx.db.query.item.findMany({
    where: and(eq(item.itemId, dbPlace.id), eq(item.itemType, 'PLACE')),
    with: {
      list: {
        columns: { id: true, name: true },
      },
    },
  })

  const associatedLists = itemsLinkingToThisPlace
    .map((itemRecord) => itemRecord.list)
    .filter((listRecord) => Boolean(listRecord))
    .map((listRecord) => ({ id: listRecord.id, name: listRecord.name }))

  let placePhotos = sanitizeStoredPhotos(dbPlace.photos)

  if (placePhotos.length === 0 && dbPlace.googleMapsId) {
    const fetchedPhotos = await fetchGooglePlacePhotos({
      placeId: dbPlace.googleMapsId,
      forceFresh: true,
    })

    if (fetchedPhotos.length > 0) {
      placePhotos = fetchedPhotos
      await ctx.db
        .update(place)
        .set({
          photos: fetchedPhotos,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(place.id, dbPlace.id))
    }
  }

  return {
    ...dbPlace,
    associatedLists,
    photos: placePhotos,
  }
}

export const placesRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const foundPlace = await ctx.db.query.place.findFirst({
        where: eq(place.id, input.id),
      })

      if (!foundPlace) {
        throw new Error('Place not found')
      }

      return foundPlace
    }),

  getByGoogleMapsId: publicProcedure
    .input(z.object({ googleMapsId: z.string() }))
    .query(async ({ ctx, input }) => {
      const foundPlace = await ctx.db.query.place.findFirst({
        where: eq(place.googleMapsId, input.googleMapsId),
      })

      if (!foundPlace) {
        throw new Error('Place not found')
      }

      return foundPlace
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        address: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        imageUrl: z.string().optional(),
        googleMapsId: z.string(),
        rating: z.number().optional(),
        types: z.array(z.string()).optional(),
        websiteUri: z.string().optional(),
        phoneNumber: z.string().optional(),
        photos: z.array(z.string()).optional(),
        listIds: z.array(z.string().uuid()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      const { listIds, ...placeData } = input

      return await ctx.db.transaction(async (tx) => {
        const newPlace = await tx
          .insert(place)
          .values({
            id: crypto.randomUUID(),
            ...placeData,
            location:
              placeData.latitude && placeData.longitude
                ? [placeData.longitude, placeData.latitude]
                : [0, 0],
          })
          .onConflictDoUpdate({
            target: [place.googleMapsId],
            set: {
              ...placeData,
              location:
                placeData.latitude && placeData.longitude
                  ? sql`ST_SetSRID(ST_MakePoint(EXCLUDED.longitude, EXCLUDED.latitude), 4326)`
                  : sql`ST_SetSRID(ST_MakePoint(0, 0), 4326)`,
            },
          })
          .returning()

        const createdPlace = newPlace[0]

        if (listIds && listIds.length > 0) {
          // Verify lists ownership
          const userLists = await tx.query.list.findMany({
            where: and(inArray(list.id, listIds), eq(list.userId, ctx.user.id)),
            columns: { id: true },
          })

          const validListIds = userLists.map((l) => l.id)

          if (validListIds.length > 0) {
            await tx
              .insert(item)
              .values(
                validListIds.map((listId) => ({
                  id: crypto.randomUUID(),
                  listId: listId,
                  itemId: createdPlace.id,
                  userId: ctx.user.id,
                  itemType: 'PLACE' as const,
                  type: 'PLACE',
                }))
              )
              .onConflictDoNothing()
          }
        }

        return createdPlace
      })
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        address: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        imageUrl: z.string().optional(),
        rating: z.number().optional(),
        types: z.array(z.string()).optional(),
        websiteUri: z.string().optional(),
        phoneNumber: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      const { id, latitude, longitude, ...updateData } = input

      // Update location if coordinates are provided
      const locationUpdate =
        latitude && longitude ? { location: [longitude, latitude] as [number, number] } : {}

      // Places are public entities, so any authenticated user can update them
      const updatedPlace = await ctx.db
        .update(place)
        .set({
          ...updateData,
          ...locationUpdate,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(place.id, id))
        .returning()

      if (updatedPlace.length === 0) {
        throw new Error("Place not found or you don't have permission to update it")
      }

      return updatedPlace[0]
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      // Places are public entities, so any authenticated user can delete them
      // In the future, we might want to add permissions/ownership checks
      const deletedPlace = await ctx.db.delete(place).where(eq(place.id, input.id)).returning()

      if (deletedPlace.length === 0) {
        throw new Error("Place not found or you don't have permission to delete it")
      }

      return { success: true }
    }),

  autocomplete: protectedProcedure
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

      const start = Date.now()
      console.log('[places.autocomplete] start')

      try {
        const locationBias =
          typeof input.latitude === 'number' && typeof input.longitude === 'number'
            ? {
                latitude: input.latitude,
                longitude: input.longitude,
                radius: input.radius ?? 50000,
              }
            : undefined

        const fetchStart = Date.now()
        const googleResults = await googleSearchPlaces({
          query,
          maxResultCount: 8,
          locationBias,
        })
        const fetchEnd = Date.now()

        const preds = googleResults.map(mapGooglePlaceToPrediction)

        const end = Date.now()
        console.log(
          '[places.autocomplete] done',
          JSON.stringify({
            results: preds.length,
            durationMs: end - start,
            googleFetchMs: fetchEnd - fetchStart,
          })
        )

        return preds
      } catch (error) {
        console.error(
          JSON.stringify({
            message: 'Failed to autocomplete places',
            service: 'placesRouter',
            function: 'autocomplete',
            error: error instanceof Error ? error.message : String(error),
          })
        )
        throw new Error('Failed to fetch autocomplete suggestions')
      }
    }),

  getDetailsById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const { id } = input
      const dbPlace = await ctx.db.query.place.findFirst({
        where: eq(place.id, id),
      })

      if (!dbPlace) {
        throw new Error('Place not found')
      }

      return enrichPlaceWithDetails(ctx, dbPlace)
    }),

  getDetailsByGoogleId: protectedProcedure
    .input(z.object({ googleMapsId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { googleMapsId } = input
      try {
        let dbPlace = await ctx.db.query.place.findFirst({
          where: eq(place.googleMapsId, googleMapsId),
        })

        if (!dbPlace) {
          const googlePlace = await fetchGooglePlaceDetails({
            placeId: googleMapsId,
          })

          if (!googlePlace) {
            throw new Error('Place not found in Google Places API')
          }

          const fetchedPhotos = extractPhotoReferences(googlePlace.photos)

          const [insertedPlace] = await ctx.db
            .insert(place)
            .values({
              id: crypto.randomUUID(),
              googleMapsId,
              name: googlePlace.displayName?.text || 'Unknown Place',
              address: googlePlace.formattedAddress,
              latitude: googlePlace.location?.latitude,
              longitude: googlePlace.location?.longitude,
              types: googlePlace.types,
              rating: googlePlace.rating,
              websiteUri: googlePlace.websiteUri,
              phoneNumber: googlePlace.nationalPhoneNumber,
              priceLevel: parsePriceLevel(googlePlace.priceLevel),
              photos: fetchedPhotos.length > 0 ? fetchedPhotos : null,
              location:
                googlePlace.location?.latitude && googlePlace.location?.longitude
                  ? ([googlePlace.location.longitude, googlePlace.location.latitude] as [
                      number,
                      number,
                    ])
                  : ([0, 0] as [number, number]),
            })
            .returning()

          if (!insertedPlace) {
            throw new Error('Failed to persist place details')
          }

          dbPlace = insertedPlace
        }

        return enrichPlaceWithDetails(ctx, dbPlace)
      } catch (error) {
        console.error('Error fetching place details by Google ID:', error, { googleMapsId })
        throw new Error('Failed to fetch place details')
      }
    }),

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
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      const { listIds, place: placeInput } = input

      let finalPlace: Place
      let affectedLists: ListSummary[] = []

      try {
        const existingPlace = await ctx.db.query.place.findFirst({
          where: eq(place.googleMapsId, placeInput.googleMapsId),
        })

        if (existingPlace) {
          finalPlace = existingPlace
        } else {
          const newPlaceData = {
            name: placeInput.name,
            googleMapsId: placeInput.googleMapsId,
            address: placeInput.address,
            location: [placeInput.longitude, placeInput.latitude] as [number, number],
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
          const [insertedPlace] = await ctx.db.insert(place).values(newPlaceData).returning()
          finalPlace = insertedPlace
        }

        const itemInsertValues = listIds.map((listId) => ({
          listId,
          itemId: finalPlace.id,
          userId: ctx.user.id,
          type: 'PLACE',
          id: crypto.randomUUID(),
        }))

        if (itemInsertValues.length > 0) {
          await ctx.db.insert(item).values(itemInsertValues).onConflictDoNothing()
        }

        const itemsInLists = await ctx.db.query.item.findMany({
          where: and(eq(item.itemId, finalPlace.id), eq(item.itemType, 'PLACE')),
          with: {
            list: { columns: { id: true, name: true } },
          },
        })

        affectedLists = itemsInLists
          .map((item) => item.list)
          .filter(
            (list): list is { id: string; name: string } => list !== null && list !== undefined
          )
          .map((list) => ({ id: list.id, name: list.name }))

        return { place: finalPlace, lists: affectedLists }
      } catch (error) {
        console.error('Failed to add place to lists:', error, { userId: ctx.user.id, placeInput })
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
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      const { listId, placeId: googleMapsIdOrDbId } = input

      try {
        const listAuthCheck = await ctx.db.query.list.findFirst({
          where: and(eq(list.id, listId), eq(list.userId, ctx.user.id)),
        })

        if (!listAuthCheck) {
          throw new Error('Forbidden: You do not own this list.')
        }

        const placeToDelete = await ctx.db.query.place.findFirst({
          where: or(eq(place.id, googleMapsIdOrDbId), eq(place.googleMapsId, googleMapsIdOrDbId)),
          columns: { id: true },
        })

        if (!placeToDelete) {
          throw new Error('Place not found in database.')
        }

        const internalPlaceId = placeToDelete.id

        const deletedItems = await ctx.db
          .delete(item)
          .where(
            and(
              eq(item.listId, listId),
              eq(item.itemId, internalPlaceId),
              eq(item.itemType, 'PLACE'),
              eq(item.userId, ctx.user.id)
            )
          )
          .returning({ id: item.id })

        if (deletedItems.length === 0) {
          throw new Error(
            'Place not found in this list, or you do not have permission to remove it.'
          )
        }

        return { message: 'Place removed from list successfully' }
      } catch (error) {
        console.error('Error deleting place from list:', error, {
          userId: ctx.user.id,
          listId,
          googleMapsIdOrDbId,
        })
        throw new Error('Failed to delete place from list')
      }
    }),

  // Get nearby places from user's lists
  getNearbyFromLists: protectedProcedure
    .input(
      z.object({
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number().optional().default(5),
        limit: z.number().optional().default(4),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      const { latitude, longitude, radiusKm, limit: resultLimit } = input

      try {
        // Query places that are in the user's lists and within the specified radius
        // Using PostGIS ST_DWithin with geography for accurate distance calculations
        const nearbyPlaces = await ctx.db
          .select({
            id: place.id,
            name: place.name,
            address: place.address,
            latitude: place.latitude,
            longitude: place.longitude,
            googleMapsId: place.googleMapsId,
            types: place.types,
            imageUrl: place.imageUrl,
            rating: place.rating,
            photos: place.photos,
            websiteUri: place.websiteUri,
            phoneNumber: place.phoneNumber,
            priceLevel: place.priceLevel,
            listId: list.id,
            listName: list.name,
            distance: sql<number>`ST_Distance(
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
              ${place.location}::geography
            )`.as('distance'),
          })
          .from(place)
          .innerJoin(item, eq(item.itemId, place.id))
          .innerJoin(list, eq(list.id, item.listId))
          .where(
            and(
              eq(item.itemType, 'PLACE'),
              or(eq(list.userId, ctx.user.id), eq(item.userId, ctx.user.id)),
              sql`ST_DWithin(
                ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
                ${place.location}::geography,
                ${radiusKm * 1000}
              )`
            )
          )
          .orderBy(sql`distance ASC`)
          .limit(resultLimit)

        // Group places by place ID and aggregate list information
        const placesMap = new Map<
          string,
          {
            id: string
            name: string
            address: string | null
            latitude: number | null
            longitude: number | null
            googleMapsId: string
            types: string[] | null
            imageUrl: string | null
            rating: number | null
            photos: string[] | null
            websiteUri: string | null
            phoneNumber: string | null
            priceLevel: number | null
            distance: number
            lists: Array<{ id: string; name: string }>
          }
        >()

        for (const row of nearbyPlaces) {
          const existing = placesMap.get(row.id)
          if (existing) {
            // Add list to existing place
            if (!existing.lists.some((l) => l.id === row.listId)) {
              existing.lists.push({ id: row.listId, name: row.listName })
            }
          } else {
            // Create new place entry
            placesMap.set(row.id, {
              id: row.id,
              name: row.name,
              address: row.address,
              latitude: row.latitude,
              longitude: row.longitude,
              googleMapsId: row.googleMapsId,
              types: row.types,
              imageUrl: row.imageUrl,
              rating: row.rating,
              photos: row.photos,
              websiteUri: row.websiteUri,
              phoneNumber: row.phoneNumber,
              priceLevel: row.priceLevel,
              distance: row.distance,
              lists: [{ id: row.listId, name: row.listName }],
            })
          }
        }

        return Array.from(placesMap.values())
      } catch (error) {
        console.error('Error fetching nearby places from lists:', error, {
          userId: ctx.user.id,
          latitude,
          longitude,
          radiusKm,
        })
        throw new Error('Failed to fetch nearby places')
      }
    }),
})
