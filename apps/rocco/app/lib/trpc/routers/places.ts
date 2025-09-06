import crypto from 'node:crypto'
import { item, list, place } from '@hominem/data/db/schema/index'
import { and, desc, eq, inArray, or } from 'drizzle-orm'
import { z } from 'zod'
import { protectedProcedure, publicProcedure, router } from '../context'

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
      // First try to find existing place
      const existingPlace = await ctx.db.query.place.findFirst({
        where: eq(place.googleMapsId, input.googleMapsId),
      })

      if (existingPlace) {
        return existingPlace
      }

      // If not found, fetch place details from Google Places API
      const apiKey = process.env.VITE_GOOGLE_API_KEY
      if (!apiKey) {
        console.error('Google API key is not configured')
        throw new Error('Google Places API is not configured')
      }

      const placeDetails = await fetch(
        `https://places.googleapis.com/v1/places/${input.googleMapsId}`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'displayName,formattedAddress,location,types,rating,websiteUri,photos',
          },
        }
      )

      if (!placeDetails.ok) {
        const errorText = await placeDetails.text()
        console.error('Google Places API error:', {
          status: placeDetails.status,
          statusText: placeDetails.statusText,
          body: errorText,
          googleMapsId: input.googleMapsId,
        })
        throw new Error(
          `Failed to fetch place details from Google Places API: ${placeDetails.status} ${placeDetails.statusText}`
        )
      }

      const placeData = await placeDetails.json()
      const placeInfo = placeData

      if (!placeInfo) {
        throw new Error('Place not found in Google Places API')
      }

      // Extract photo URLs from the API response
      const photoUrls =
        placeInfo.photos?.map((photo: { name: string }) => {
          return photo.name
        }) || []

      // Create new place with fetched data (without userId since this is public)
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
          priceLevel: placeInfo.priceLevel || null,
          photos: photoUrls.length > 0 ? photoUrls : undefined,
          userId: '', // Empty for public places
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

      // First try to find existing place
      const existingPlace = await ctx.db.query.place.findFirst({
        where: eq(place.googleMapsId, input.googleMapsId),
      })

      if (existingPlace) {
        return existingPlace
      }

      // If not found, fetch place details from Google Places API
      const apiKey = process.env.VITE_GOOGLE_API_KEY
      if (!apiKey) {
        console.error('Google API key is not configured')
        throw new Error('Google Places API is not configured')
      }

      const placeDetails = await fetch(
        `https://places.googleapis.com/v1/places/${input.googleMapsId}`,
        {
          headers: {
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'displayName,formattedAddress,location,types,rating,websiteUri,photos',
          },
        }
      )

      if (!placeDetails.ok) {
        const errorText = await placeDetails.text()
        console.error('Google Places API error:', {
          status: placeDetails.status,
          statusText: placeDetails.statusText,
          body: errorText,
          googleMapsId: input.googleMapsId,
        })
        throw new Error(
          `Failed to fetch place details from Google Places API: ${placeDetails.status} ${placeDetails.statusText}`
        )
      }

      const placeData = await placeDetails.json()
      const placeInfo = placeData

      if (!placeInfo) {
        throw new Error('Place not found in Google Places API')
      }

      // Extract photo URLs from the API response
      // Google Places API returns photo references that need to be converted to URLs
      const photoUrls =
        placeInfo.photos?.map((photo: { name: string }) => {
          // The photo.name contains the photo reference
          // We'll store the photo reference and let the frontend handle the URL construction
          // This allows for better caching and size optimization
          return photo.name
        }) || []

      // Create new place with fetched data
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
          priceLevel: placeInfo.priceLevel || null,
          photos: photoUrls.length > 0 ? photoUrls : undefined,
          userId: ctx.user.id,
          location:
            placeInfo.location?.latitude && placeInfo.location?.longitude
              ? ([placeInfo.location.longitude, placeInfo.location.latitude] as [number, number])
              : ([0, 0] as [number, number]),
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
          userId: ctx.user.id,
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

      const updatedPlace = await ctx.db
        .update(place)
        .set({
          ...updateData,
          ...locationUpdate,
          updatedAt: new Date().toISOString(),
        })
        .where(and(eq(place.id, id), eq(place.userId, ctx.user.id)))
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

      const deletedPlace = await ctx.db
        .delete(place)
        .where(and(eq(place.id, input.id), eq(place.userId, ctx.user.id)))
        .returning()

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
        // Use Google Places API for search
        const apiKey = process.env.VITE_GOOGLE_API_KEY
        if (!apiKey) {
          console.error('Google API key is not configured')
          throw new Error('Google Places API is not configured')
        }

        const searchUrl = 'https://places.googleapis.com/v1/places:searchText'
        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'places.id,places.displayName,places.formattedAddress,places.location,places.types,places.websiteUri,places.phoneNumber',
          },
          body: JSON.stringify({
            textQuery: query,
            locationBias: {
              circle: {
                center: {
                  latitude: latitude,
                  longitude: longitude,
                },
                radius: radius,
              },
            },
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Google Places API search error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText,
            query,
          })
          throw new Error(`Failed to search places: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        const places = data.places || []

        const searchResults = places.map((p: any) => ({
          googleMapsId: p.id,
          name: p.displayName?.text || 'Unknown Place',
          address: p.formattedAddress || '',
          location: p.location ? [p.location.longitude, p.location.latitude] : [0, 0],
          types: p.types || [],
          imageUrl: null, // Will be fetched separately if needed
          websiteUri: p.websiteUri || null,
          phoneNumber: p.phoneNumber || null,
        }))

        return searchResults
      } catch (error) {
        console.error('Could not fetch places:', error)
        throw new Error('Failed to fetch places')
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

      let dbPlace: any = null
      let associatedLists: any[] = []
      let photos: any[] = []

      try {
        dbPlace = await ctx.db.query.place.findFirst({
          where: or(eq(place.id, googleMapsIdOrDbId), eq(place.googleMapsId, googleMapsIdOrDbId)),
        })

        if (!dbPlace) {
          // If not in DB, fetch from Google and insert
          const apiKey = process.env.VITE_GOOGLE_API_KEY
          if (!apiKey) {
            console.error('Google API key is not configured')
            throw new Error('Google Places API is not configured')
          }

          const placeDetails = await fetch(
            `https://places.googleapis.com/v1/places/${googleMapsIdOrDbId}`,
            {
              headers: {
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask':
                  'places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.websiteUri,places.phoneNumber,places.priceLevel,places.photos',
              },
            }
          )

          if (!placeDetails.ok) {
            const errorText = await placeDetails.text()
            console.error('Google Places API error in getDetails:', {
              status: placeDetails.status,
              statusText: placeDetails.statusText,
              body: errorText,
              googleMapsId: googleMapsIdOrDbId,
            })
            throw new Error(
              `Failed to fetch place details from Google Places API: ${placeDetails.status} ${placeDetails.statusText}`
            )
          }

          const placeData = await placeDetails.json()
          const placeInfo = placeData

          if (!placeInfo) {
            throw new Error('Place not found in Google Places API')
          }

          const [insertedPlace] = await ctx.db
            .insert(place)
            .values({
              id: crypto.randomUUID(),
              googleMapsId: googleMapsIdOrDbId,
              name: placeInfo.displayName?.text || 'Unknown Place',
              address: placeInfo.formattedAddress,
              latitude: placeInfo.location?.latitude,
              longitude: placeInfo.location?.longitude,
              types: placeInfo.types,
              rating: placeInfo.rating,
              websiteUri: placeInfo.websiteUri,
              phoneNumber: placeInfo.nationalPhoneNumber,
              priceLevel: placeInfo.priceLevel,
              userId: ctx.user?.id || '',
              location:
                placeInfo.location?.latitude && placeInfo.location?.longitude
                  ? ([placeInfo.location.longitude, placeInfo.location.latitude] as [
                      number,
                      number,
                    ])
                  : ([0, 0] as [number, number]),
            })
            .returning()

          dbPlace = insertedPlace
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

        // TODO: Implement photo fetching from Google Places API
        photos = []
      } catch (error) {
        console.error('Error fetching place details by ID:', error, { googleMapsIdOrDbId })
        throw new Error('Failed to fetch place details')
      }

      if (!dbPlace) {
        throw new Error('Place not found after all checks')
      }

      return {
        ...dbPlace,
        associatedLists,
        photos,
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

      let finalPlace: any
      let affectedLists: any[] = []

      try {
        const existingPlace = await ctx.db.query.place.findFirst({
          where: eq(place.googleMapsId, placeInput.googleMapsId),
        })

        if (existingPlace) {
          finalPlace = existingPlace
        } else {
          const newPlaceData = {
            userId: ctx.user.id,
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
          .filter((list) => list !== null && list !== undefined)
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
})
