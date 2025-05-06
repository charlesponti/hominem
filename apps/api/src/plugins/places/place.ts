import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import { item, list, place as Place } from '@hominem/utils/schema'
import { and, eq } from 'drizzle-orm'
import type { FastifyPluginAsync } from 'fastify'
import {
  type FormattedPlace,
  type PhotoMedia,
  getPlaceDetails,
  getPlacePhotos,
} from '../google/places'

export const getPlace: FastifyPluginAsync = async (server) => {
  server.get(
    '/places/:id',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              name: { type: 'string' },
              id: { type: 'string' },
              googleMapsId: { type: 'string' },
              imageUrl: { type: 'string' },
              phoneNumber: { type: 'string' },
              photos: { type: 'array', items: { type: 'string' } },
              types: { type: 'array', items: { type: 'string' } },
              websiteUri: { type: 'string' },
              location: {
                latitude: { type: 'number' },
                longitude: { type: 'number' },
              },
              lists: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                },
              },
            },
            required: [
              'address',
              'latitude',
              'longitude',
              'name',
              'googleMapsId',
              'imageUrl',
              'photos',
              'types',
            ],
          },
          404: {
            type: 'null',
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      let photos: PhotoMedia[] | undefined
      let lists: { id: string; name: string }[] = []
      let place: typeof Place.$inferSelect | FormattedPlace | null = null

      try {
        place = await db
          .select()
          .from(Place)
          .where(eq(Place.googleMapsId, id))
          .then(takeUniqueOrThrow)
      } catch (err) {
        request.log.error(err, 'Could not fetch place')
        return reply.code(500).send()
      }

      // If this place has not been saved before, fetch it from Google.
      if (!place) {
        try {
          place = await getPlaceDetails({
            placeId: id,
          })

          // If the place does not exist in Google, return a 404.
          if (!place) {
            server.log.error('GET Place - Could not find place from Google')
            return reply.code(404).send()
          }
        } catch (err) {
          const statusCode = (err as { response: { status: number } })?.response?.status || 500

          server.log.error('GET Place Google Error', err)
          return reply.code(statusCode).send()
        }
      }

      if (!place.googleMapsId) {
        server.log.error('GET Place - Place does not have a Google Maps ID')
        return reply.code(404).send()
      }

      try {
        photos = await getPlacePhotos({
          googleMapsId: place.googleMapsId as string,
          limit: 5,
        })
      } catch (err) {
        server.log.error(err, 'Could not fetch photos from Google')
        return reply.code(500).send()
      }

      if (place?.id) {
        try {
          const items = await db
            .select()
            .from(item)
            .where(and(eq(item.itemId, place.id), eq(item.itemType, 'PLACE')))
            .leftJoin(list, eq(list.id, item.listId))

          lists = items?.map((item) => item?.list).filter(Boolean)
        } catch (err) {
          server.log.error(err, 'Could not fetch lists')
          return reply.code(500).send()
        }
      }

      return reply.code(200).send({
        ...place,
        imageUrl: photos?.[0]?.imageUrl || '',
        photos: photos?.map((photo) => photo.imageUrl) || [],
        lists: lists ?? [],
      })
    }
  )
}
