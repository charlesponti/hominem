import { item, list, place } from '@hominem/data'
import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import crypto from 'node:crypto'
import { z } from 'zod'
import {
  getPlaceDetails as fetchGooglePlaceDetails,
  getPlacePhotos as fetchGooglePlacePhotos,
  searchPlaces as googleSearchPlaces,
} from '~/lib/google-places.server'
import type {
  GooglePlaceDetailsResponse,
  GooglePlacePrediction,
  GooglePlacesApiResponse,
  Place,
} from '~/lib/types'
import { protectedProcedure, publicProcedure, router } from '../context'

const extractPhotoReferences = (photos: GooglePlaceDetailsResponse['photos']): string[] => {
  if (!photos) {
    return []
  }

  return photos
    .map((photo) => photo.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
}

const sanitizeStoredPhotos = (photos: string[] | null | undefined): string[] => {
  if (!Array.isArray(photos)) {
    return []
  }

  return photos.filter((photo): photo is string => typeof photo === 'string' && photo.length > 0)
}

/**
 * Converts Google Places API price level string to a numeric value.
 * Google returns strings like "PRICE_LEVEL_MODERATE", but we store integers in the database.
 */
const parsePriceLevel = (priceLevel: string | number | null | undefined): number | null => {
  if (priceLevel === null || priceLevel === undefined) {
    return null
  }

  // If it's already a number, return it
  if (typeof priceLevel === 'number') {
    return priceLevel
  }

  const priceLevelMap: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  }

  return priceLevelMap[priceLevel] ?? null
}

const mapGooglePlaceToPrediction = (
  placeResult: GooglePlacesApiResponse
): GooglePlacePrediction => ({
  description: placeResult.displayName?.text ?? '',
  place_id: placeResult.id,
  structured_formatting: {
    main_text: placeResult.displayName?.text ?? '',
    secondary_text: placeResult.formattedAddress ?? '',
  },
  location:
    placeResult.location &&
    typeof placeResult.location.latitude === 'number' &&
    typeof placeResult.location.longitude === 'number'
      ? {
          latitude: placeResult.location.latitude,
          longitude: placeResult.location.longitude,
        }
      : null,
  priceLevel: placeResult.priceLevel,
})

type ListSummary = {
  id: string
  name: string
}

export const placesRouter = router({
  getAll: publicProcedure.query(async ({ ctx }) => {
    const allPlaces = await ctx.db.query.place.findMany({
      orderBy: [desc(place.createdAt)],
    })

    return allPlaces
  }),

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

  getOrCreateByGoogleMapsIdPublic: publicProcedure
    .input(z.object({ googleMapsId: z.string() }))
    .query(async ({ ctx, input }) => {
      // First try to find existing place (can be read without auth)
      const existingPlace = await ctx.db.query.place.findFirst({
        where: eq(place.googleMapsId, input.googleMapsId),
      })

      if (existingPlace) {
        return existingPlace
      }

      const placeInfo = await fetchGooglePlaceDetails({
        placeId: input.googleMapsId,
      })

      // Create new place with fetched data (places are public/shared entities)
      const newPlace = await ctx.db
        .insert(place)
        .values({
          id: crypto.randomUUID(),
          googleMapsId: input.googleMapsId,
          name: placeInfo.displayName?.text || 'Unknown Place',
          address: placeInfo.formattedAddress,
          latitude: placeInfo.location?.latitude,
          longitude: placeInfo.location?.longitude,
          types: placeInfo.types,
          rating: placeInfo.rating,
          websiteUri: placeInfo.websiteUri,
          phoneNumber: placeInfo.nationalPhoneNumber || null,
          priceLevel: parsePriceLevel(placeInfo.priceLevel),
          photos: extractPhotoReferences(placeInfo.photos),
          location:
            placeInfo.location?.latitude && placeInfo.location?.longitude
              ? ([placeInfo.location.longitude, placeInfo.location.latitude] as [number, number])
              : ([0, 0] as [number, number]),
        })
        .returning()

      return newPlace[0]
    }),

  getOrCreateByGoogleMapsId: protectedProcedure
    .input(
      z.object({
        googleMapsId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      // Find existing place
      const existingPlace = await ctx.db.query.place.findFirst({
        where: eq(place.googleMapsId, input.googleMapsId),
      })

      if (existingPlace) {
        return existingPlace
      }

      const placeInfo = await fetchGooglePlaceDetails({
        placeId: input.googleMapsId,
      })

      const newPlace = await ctx.db
        .insert(place)
        .values({
          id: crypto.randomUUID(),
          googleMapsId: input.googleMapsId,
          name: placeInfo.displayName?.text || 'Unknown Place',
          address: placeInfo.formattedAddress,
          latitude: placeInfo.location?.latitude,
          longitude: placeInfo.location?.longitude,
          types: placeInfo.types,
          rating: placeInfo.rating,
          websiteUri: placeInfo.websiteUri,
          phoneNumber: placeInfo.nationalPhoneNumber || null,
          priceLevel: parsePriceLevel(placeInfo.priceLevel),
          photos: extractPhotoReferences(placeInfo.photos),
          location:
            placeInfo.location?.latitude && placeInfo.location?.longitude
              ? [placeInfo.location.longitude, placeInfo.location.latitude]
              : [0, 0],
        })
        .onConflictDoUpdate({
          target: [place.googleMapsId],
          set: {
            name: placeInfo.displayName?.text || 'Unknown Place',
            address: placeInfo.formattedAddress,
            latitude: placeInfo.location?.latitude,
            longitude: placeInfo.location?.longitude,
          },
        })
        .returning()

      return newPlace[0]
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      const newPlace = await ctx.db
        .insert(place)
        .values({
          id: crypto.randomUUID(),
          ...input,
          location:
            input.latitude && input.longitude
              ? ([input.longitude, input.latitude] as [number, number])
              : ([0, 0] as [number, number]), // Default location if coordinates not provided
        })
        .returning()

      return newPlace[0]
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
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
        const googleResults = await googleSearchPlaces({
          query,
          locationBias: {
            latitude,
            longitude,
            radius,
          },
        })

        return googleResults.map((placeResult: GooglePlacesApiResponse) => ({
          googleMapsId: placeResult.id,
          name: placeResult.displayName?.text || 'Unknown Place',
          address: placeResult.formattedAddress || '',
          location: placeResult.location
            ? [placeResult.location.longitude, placeResult.location.latitude]
            : [0, 0],
          types: placeResult.types || [],
          imageUrl: null,
          websiteUri: placeResult.websiteUri || null,
          phoneNumber: placeResult.nationalPhoneNumber || null,
        }))
      } catch (error) {
        console.error('Could not fetch places:', error)
        throw new Error('Failed to fetch places')
      }
    }),

  autocomplete: protectedProcedure
    .input(
      z.object({
        query: z.string().min(2),
      })
    )
    .query(async ({ input }) => {
      const query = input.query.trim()
      if (query.length < 2) {
        return []
      }

      try {
        const googleResults = await googleSearchPlaces({
          query,
          maxResultCount: 8,
        })

        return googleResults.map(mapGooglePlaceToPrediction)
      } catch (error) {
        console.error('Failed to autocomplete places:', error)
        throw new Error('Failed to fetch autocomplete suggestions')
      }
    }),

  getListsForPlace: publicProcedure
    .input(z.object({ placeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Find all items where itemId = placeId and itemType = 'PLACE'
      const items = await ctx.db.query.item.findMany({
        where: and(eq(item.itemId, input.placeId), eq(item.itemType, 'PLACE')),
      })
      const listIds = items.map((i) => i.listId)
      if (listIds.length === 0) return []
      // Fetch the lists
      const lists = await ctx.db.query.list.findMany({
        where: inArray(list.id, listIds),
      })
      return lists
    }),

  // Get place details by ID (Google Maps ID or DB ID)
  getDetails: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const { id: googleMapsIdOrDbId } = input

      let dbPlace: Place | null = null
      let associatedLists: ListSummary[] = []
      // Check if input is a valid UUID
      const isUuid = z.string().uuid().safeParse(googleMapsIdOrDbId).success

      try {
        if (isUuid) {
          dbPlace =
            (await ctx.db.query.place.findFirst({
              where: eq(place.id, googleMapsIdOrDbId),
            })) ?? null
        } else {
          dbPlace =
            (await ctx.db.query.place.findFirst({
              where: eq(place.googleMapsId, googleMapsIdOrDbId),
            })) ?? null
        }

        if (!dbPlace) {
          // If not in DB, fetch from Google and insert
          const googlePlace = await fetchGooglePlaceDetails({
            placeId: googleMapsIdOrDbId,
          })

          if (!googlePlace) {
            throw new Error('Place not found in Google Places API')
          }

          const fetchedPhotos = extractPhotoReferences(googlePlace.photos)

          const [insertedPlace] = await ctx.db
            .insert(place)
            .values({
              id: crypto.randomUUID(),
              googleMapsId: googleMapsIdOrDbId,
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
        } else if (!dbPlace.googleMapsId && googleMapsIdOrDbId && !isUuid) {
          // Edge case: DB place missing Google ID (shouldn't happen, but attempt recovery)
          dbPlace = {
            ...dbPlace,
            googleMapsId: googleMapsIdOrDbId,
          }
        }

        const itemsLinkingToThisPlace = await ctx.db.query.item.findMany({
          where: and(eq(item.itemId, dbPlace.id), eq(item.itemType, 'PLACE')),
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
      } catch (error) {
        console.error('Error fetching place details by ID:', error, { googleMapsIdOrDbId })
        throw new Error('Failed to fetch place details')
      }

      if (!dbPlace) {
        throw new Error('Place not found after all checks')
      }

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

          dbPlace = {
            ...dbPlace,
            photos: fetchedPhotos,
          }
        }
      }

      return {
        ...dbPlace,
        associatedLists,
        photos: placePhotos,
      }
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
