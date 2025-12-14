import {
  addPlaceToLists,
  createOrUpdatePlace,
  deletePlaceById,
  ensurePlaceFromGoogleData,
  getItemsForPlace,
  getNearbyPlacesFromLists,
  getPlaceByGoogleMapsId,
  getPlaceById,
  type PlaceInsert,
  type Place as PlaceSelect,
  removePlaceFromList,
  updatePlacePhotos,
} from '@hominem/data'
import { z } from 'zod'
import {
  getPlaceDetails as fetchGooglePlaceDetails,
  getPlacePhotos as fetchGooglePlacePhotos,
  searchPlaces as googleSearchPlaces,
} from '~/lib/google-places.server'
import {
  extractPhotoReferences,
  mapGooglePlaceToPrediction,
  sanitizeStoredPhotos,
  transformGooglePlaceToPlaceInsert,
} from '~/lib/places-utils'
import { logger } from '../../logger'
import { type Context, protectedProcedure, publicProcedure, router } from '../context'

type ListSummary = {
  id: string
  name: string
}

const enrichPlaceWithDetails = async (_ctx: Context, dbPlace: PlaceSelect) => {
  const itemsLinkingToThisPlace = await getItemsForPlace(dbPlace.id)

  const associatedLists = itemsLinkingToThisPlace
    .map((itemRecord) => itemRecord.list)
    .filter((listRecord): listRecord is { id: string; name: string } => Boolean(listRecord))
    .map((listRecord) => ({ id: listRecord.id, name: listRecord.name }))

  let placePhotos = sanitizeStoredPhotos(dbPlace.photos)

  if (placePhotos.length === 0 && dbPlace.googleMapsId) {
    const fetchedPhotos = await fetchGooglePlacePhotos({
      placeId: dbPlace.googleMapsId,
      forceFresh: true,
    })

    if (fetchedPhotos.length > 0) {
      placePhotos = fetchedPhotos
      await updatePlacePhotos(dbPlace.id, fetchedPhotos)
    }
  }

  return {
    ...dbPlace,
    associatedLists,
    photos: placePhotos,
  }
}

export const placesRouter = router({
  getById: publicProcedure.input(z.object({ id: z.uuid() })).query(async ({ input }) => {
    const foundPlace = await getPlaceById(input.id)

    if (!foundPlace) {
      throw new Error('Place not found')
    }

    return foundPlace
  }),

  getByGoogleMapsId: publicProcedure
    .input(z.object({ googleMapsId: z.string() }))
    .query(async ({ input }) => {
      const foundPlace = await getPlaceByGoogleMapsId(input.googleMapsId)

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

      const { listIds, ...placeInput } = input

      // Fetch Google Place details if photos/imageUrl are missing
      let fetchedPhotos: string[] | null = null
      let fetchedImageUrl: string | null = null
      let fetchedRating: number | null = null
      let fetchedTypes: string[] | null = null
      let fetchedAddress: string | null = null
      let fetchedLatitude: number | null = null
      let fetchedLongitude: number | null = null
      let fetchedWebsiteUri: string | null = null
      let fetchedPhoneNumber: string | null = null

      const needsDetails =
        !placeInput.photos ||
        placeInput.photos.length === 0 ||
        !placeInput.imageUrl ||
        !placeInput.rating ||
        !placeInput.types ||
        placeInput.types.length === 0

      if (needsDetails) {
        try {
          const googlePlace = await fetchGooglePlaceDetails({
            placeId: placeInput.googleMapsId,
            forceFresh: true,
          })

          if (googlePlace) {
            // Extract photos
            fetchedPhotos = extractPhotoReferences(googlePlace.photos)
            fetchedImageUrl = fetchedPhotos.length > 0 && fetchedPhotos[0] ? fetchedPhotos[0] : null

            // Use fetched data to fill in missing fields
            fetchedRating = googlePlace.rating ?? null
            fetchedTypes = googlePlace.types ?? null
            fetchedAddress = googlePlace.formattedAddress ?? null
            fetchedLatitude = googlePlace.location?.latitude ?? null
            fetchedLongitude = googlePlace.location?.longitude ?? null
            fetchedWebsiteUri = googlePlace.websiteUri ?? null
            fetchedPhoneNumber = googlePlace.nationalPhoneNumber ?? null
          }
        } catch (error) {
          logger.error('Failed to fetch Google Place details during create', {
            error: error instanceof Error ? error.message : String(error),
            googleMapsId: placeInput.googleMapsId,
          })
          // Continue with provided data if fetch fails
        }
      }

      // Transform input to PlaceInsert format, using fetched data to fill gaps
      const placeData: PlaceInsert = {
        googleMapsId: placeInput.googleMapsId,
        name: placeInput.name,
        address: placeInput.address ?? fetchedAddress ?? null,
        latitude: placeInput.latitude ?? fetchedLatitude ?? null,
        longitude: placeInput.longitude ?? fetchedLongitude ?? null,
        location:
          placeInput.latitude && placeInput.longitude
            ? [placeInput.longitude, placeInput.latitude]
            : fetchedLatitude && fetchedLongitude
              ? [fetchedLongitude, fetchedLatitude]
              : [0, 0],
        types:
          placeInput.types && placeInput.types.length > 0
            ? placeInput.types
            : (fetchedTypes ?? null),
        rating: placeInput.rating ?? fetchedRating ?? null,
        websiteUri: placeInput.websiteUri ?? fetchedWebsiteUri ?? null,
        phoneNumber: placeInput.phoneNumber ?? fetchedPhoneNumber ?? null,
        photos:
          placeInput.photos && placeInput.photos.length > 0
            ? placeInput.photos
            : (fetchedPhotos ?? null),
        imageUrl:
          placeInput.imageUrl ??
          (placeInput.photos && placeInput.photos.length > 0
            ? placeInput.photos[0]
            : (fetchedImageUrl ?? null)),
      }

      const { place: createdPlace } = await addPlaceToLists(ctx.user.id, listIds ?? [], placeData)

      return createdPlace
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

      const locationUpdate =
        latitude && longitude ? { location: [longitude, latitude] as [number, number] } : {}

      const updatedPlace = await createOrUpdatePlace(id, {
        ...updateData,
        ...locationUpdate,
      })

      if (!updatedPlace) {
        throw new Error("Place not found or you don't have permission to update it")
      }

      return updatedPlace
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      const deleted = await deletePlaceById(input.id)

      if (!deleted) {
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
      logger.info('[placesRouter] autocomplete start', {
        query: input.query,
        latitude: input.latitude,
        longitude: input.longitude,
        radius: input.radius,
      })

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

        const fetchStart = Date.now()
        const googleResults = await googleSearchPlaces({
          query,
          maxResultCount: 8,
          locationBias,
        })
        const fetchEnd = Date.now()

        const preds = googleResults.map(mapGooglePlaceToPrediction)

        const end = Date.now()
        logger.info('[placesRouter] autocomplete done', {
          results: preds.length,
          durationMs: end - start,
          googleFetchMs: fetchEnd - fetchStart,
          query,
          locationBias,
        })

        return preds
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
    }),

  getDetailsById: protectedProcedure
    .input(z.object({ id: z.uuid() }))
    .query(async ({ input, ctx }) => {
      const { id } = input
      const dbPlace = await getPlaceById(id)

      if (!dbPlace) {
        throw new Error('Place not found')
      }

      return enrichPlaceWithDetails(ctx, dbPlace)
    }),

  getDetailsByGoogleId: protectedProcedure
    .input(z.object({ googleMapsId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const { googleMapsId } = input
      try {
        let dbPlace = await getPlaceByGoogleMapsId(googleMapsId)

        if (!dbPlace) {
          const googlePlace = await fetchGooglePlaceDetails({
            placeId: googleMapsId,
          })

          if (!googlePlace) {
            throw new Error('Place not found in Google Places API')
          }

          const placeData = transformGooglePlaceToPlaceInsert(googlePlace, googleMapsId)
          dbPlace = await ensurePlaceFromGoogleData(placeData)
        }

        return enrichPlaceWithDetails(ctx, dbPlace)
      } catch (error) {
        logger.error('Error fetching place details by Google ID', {
          error: error instanceof Error ? error.message : String(error),
          googleMapsId,
        })
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

      // Transform input to PlaceInsert format
      const placeData: PlaceInsert = {
        googleMapsId: placeInput.googleMapsId,
        name: placeInput.name,
        address: placeInput.address ?? null,
        latitude: placeInput.latitude ?? null,
        longitude: placeInput.longitude ?? null,
        location: [placeInput.longitude, placeInput.latitude],
        types: placeInput.types ?? null,
        rating: null,
        websiteUri: placeInput.websiteUri ?? null,
        phoneNumber: placeInput.phoneNumber ?? null,
        photos: null,
        imageUrl: placeInput.imageUrl ?? null,
        priceLevel: null,
      }

      let finalPlace: PlaceSelect
      let affectedLists: ListSummary[] = []

      try {
        const result = await addPlaceToLists(ctx.user.id, listIds, placeData)
        finalPlace = result.place
        affectedLists = result.lists

        return { place: finalPlace, lists: affectedLists }
      } catch (error) {
        logger.error('Failed to add place to lists', {
          error: error instanceof Error ? error.message : String(error),
          userId: ctx.user.id,
          placeInput,
        })
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
        const removed = await removePlaceFromList({
          listId,
          placeIdentifier: googleMapsIdOrDbId,
          userId: ctx.user.id,
        })

        if (!removed) {
          throw new Error(
            'Place not found in this list, or you do not have permission to remove it.'
          )
        }

        return { message: 'Place removed from list successfully' }
      } catch (error) {
        logger.error('Error deleting place from list', {
          error: error instanceof Error ? error.message : String(error),
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
        return await getNearbyPlacesFromLists({
          userId: ctx.user.id,
          latitude,
          longitude,
          radiusKm,
          limit: resultLimit,
        })
      } catch (error) {
        logger.error('Error fetching nearby places from lists', {
          error: error instanceof Error ? error.message : String(error),
          userId: ctx.user.id,
          latitude,
          longitude,
          radiusKm,
        })
        throw new Error('Failed to fetch nearby places')
      }
    }),
})
