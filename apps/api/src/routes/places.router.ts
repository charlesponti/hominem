import { verifyAuth } from '@/middleware/auth'
import type { PhotoMedia } from '@/plugins/google/places'
import { getPlaceDetails, getPlacePhotos, searchPlaces } from '@/plugins/google/places'
import { db } from '@hominem/utils/db'
import { item as itemTable, list as listTable, place as placesTable } from '@hominem/utils/schema'
import type { Place as DbPlaceSchema, ItemInsert, PlaceInsert } from '@hominem/utils/types'
import { and, eq, or } from 'drizzle-orm'
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import crypto from 'node:crypto'
import { z } from 'zod'

const SearchPlacesQuerySchema = z.object({
  query: z.string().min(1),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  radius: z.coerce.number().positive(),
})

const PlaceIdParamSchema = z.object({
  id: z.string().min(1),
})

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

const DeletePlaceFromListParamsSchema = z.object({
  listId: z.string().uuid(),
  placeId: z.string().uuid(),
})

interface NormalizedListInfo {
  id: string
  name: string
}

interface NormalizedPlaceResponse {
  id: string
  googleMapsId: string
  name: string
  address: string
  location: [number | null | undefined, number | null | undefined]
  types: string[]
  imageUrl: string | null
  websiteUri: string | null
  phoneNumber: string | null
  photos: string[]
  lists: NormalizedListInfo[]
  description: string | null
  createdAt: string | null
  updatedAt: string | null
  rating?: number | null
  isPublic?: boolean
  wifiInfo?: string | null
  bestFor?: string | null
}

// Normalize a Place (DB or PlaceInsert) for API response
function normalizePlaceForResponse(
  place: DbPlaceSchema,
  associatedLists: NormalizedListInfo[] = [],
  fetchedPhotos: PhotoMedia[] = []
): NormalizedPlaceResponse {
  const [lon, lat] = place.location ?? [null, null]
  const photosUrls = fetchedPhotos.map((p) => p.imageUrl).filter(Boolean) as string[]

  return {
    id: place.id,
    googleMapsId: place.googleMapsId,
    name: place.name,
    address: place.address || '',
    location: [lon, lat],
    types: place.types ?? [],
    imageUrl: photosUrls[0] || place.imageUrl || null,
    websiteUri: place.websiteUri || null,
    phoneNumber: place.phoneNumber || null,
    photos: photosUrls,
    lists: associatedLists,
    description: place.description || null,
    createdAt: place.createdAt || null,
    updatedAt: place.updatedAt || null,
    rating: place.rating ?? null,
    isPublic: place.isPublic ?? false,
    wifiInfo: place.wifiInfo ?? null,
    bestFor: place.bestFor ?? null,
  }
}

const PlacesPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get(
    '/places/search',
    {
      // schema property removed
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const queryParseResult = SearchPlacesQuerySchema.safeParse(request.query)
      if (!queryParseResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: queryParseResult.error.format(),
        })
      }
      const { query, latitude, longitude, radius } = queryParseResult.data

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
        return reply.code(200).send(searchResults)
      } catch (err) {
        request.log.error({ err }, 'Could not fetch places')
        return reply.code(500).send({ error: 'Failed to fetch places' })
      }
    }
  )

  server.get(
    '/places/:id',
    {
      preHandler: verifyAuth,
      // schema property removed
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const paramsParseResult = PlaceIdParamSchema.safeParse(request.params)
      if (!paramsParseResult.success) {
        return reply.status(400).send({
          error: 'Invalid path parameters',
          details: paramsParseResult.error.format(),
        })
      }
      const { id: googleMapsIdOrDbId } = paramsParseResult.data

      let dbPlace: DbPlaceSchema | null | undefined = null
      let associatedLists: NormalizedListInfo[] = []
      let photos: PhotoMedia[] = []
      const { userId } = request

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
      } catch (err) {
        request.log.error({ err, googleMapsIdOrDbId }, 'Error fetching place details by ID')
        return reply.status(500).send({ error: 'Failed to fetch place details' })
      }

      if (!dbPlace) {
        return reply.code(404).send({ message: 'Place not found after all checks' })
      }

      const normalizedPlace = normalizePlaceForResponse(dbPlace, associatedLists, photos)
      return reply.code(200).send(normalizedPlace)
    }
  )

  server.post(
    '/lists/place',
    {
      preHandler: verifyAuth,
      // schema already removed
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized: User ID is missing' })
      }
      const bodyParseResult = AddPlaceToListsBodySchema.safeParse(request.body)

      if (!bodyParseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: bodyParseResult.error.format(),
        })
      }
      const { listIds, place: placeInput } = bodyParseResult.data

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

        return reply.code(200).send({ place: normalizedFinalPlace, lists: affectedLists })
      } catch (err: unknown) {
        request.log.error({ err, userId, placeInput }, 'Failed to add place to lists')
        return reply.status(500).send({ error: 'Failed to process request' })
      }
    }
  )

  server.delete(
    '/lists/:listId/place/:placeId',
    {
      preHandler: verifyAuth,
      // schema property removed
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized: User ID is missing' })
      }
      const paramsParseResult = DeletePlaceFromListParamsSchema.safeParse(request.params)

      if (!paramsParseResult.success) {
        return reply.status(400).send({
          error: 'Invalid path parameters',
          details: paramsParseResult.error.format(),
        })
      }
      const { listId, placeId: googleMapsIdOrDbId } = paramsParseResult.data

      try {
        const listAuthCheck = await db.query.list.findFirst({
          where: and(eq(listTable.id, listId), eq(listTable.userId, userId)),
        })

        if (!listAuthCheck) {
          return reply.status(403).send({ error: 'Forbidden: You do not own this list.' })
        }

        const placeToDelete = await db.query.place.findFirst({
          where: or(
            eq(placesTable.id, googleMapsIdOrDbId),
            eq(placesTable.googleMapsId, googleMapsIdOrDbId)
          ),
          columns: { id: true },
        })

        if (!placeToDelete) {
          return reply.status(404).send({ error: 'Place not found in database.' })
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
          return reply.status(404).send({
            error: 'Place not found in this list, or you do not have permission to remove it.',
          })
        }

        return reply.status(200).send({ message: 'Place removed from list successfully' })
      } catch (err) {
        request.log.error(
          { err, userId, listId, googleMapsIdOrDbId },
          'Error deleting place from list'
        )
        return reply.status(500).send({ error: 'Failed to delete place from list' })
      }
    }
  )
}

export default PlacesPlugin
