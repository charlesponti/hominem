import { db, takeUniqueOrThrow } from '@hominem/utils/db'
import { item, list, place as places } from '@hominem/utils/schema'
import { and, eq, inArray } from 'drizzle-orm'
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { EVENTS, track } from '../../analytics'
import {
  getPlaceDetails,
  getPlacePhotos,
  type FormattedPlace,
  type PhotoMedia,
} from '../google/places'

const types = {
  location: {
    latitude: { type: 'number' },
    longitude: { type: 'number' },
  },
}

type Location = {
  latitude: number
  longitude: number
}

const CreatePlaceProperties = {
  ...types.location,
  name: { type: 'string' },
  address: { type: 'string' },
  googleMapsId: { type: 'string' },
  websiteUri: { type: 'string' },
  imageUrl: { type: 'string' },
  types: { type: 'array', items: { type: 'string' } },
}

const CreatePlaceRequired = Object.keys(CreatePlaceProperties)

const CreatePlaceResponseProperties = {
  ...CreatePlaceProperties,
  id: { type: 'string' },
  description: { type: 'string' },
  createdAt: { type: 'string' },
  updatedAt: { type: 'string' },
}
const CreatePlaceResponseRequired = Object.keys(CreatePlaceResponseProperties)

const PlacesPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.post(
    '/lists/place',
    {
      schema: {
        body: {
          type: 'object',
          properties: {
            listIds: {
              type: 'array',
              items: { type: 'string' },
            },
            place: {
              type: 'object',
              properties: CreatePlaceProperties,
              required: CreatePlaceRequired,
            },
          },
          required: ['listIds', 'place'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              lists: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                  },
                },
              },
              place: {
                type: 'object',
                properties: CreatePlaceResponseProperties,
                required: CreatePlaceResponseRequired,
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' })
      }

      const { listIds, place } = request.body as PlacePostBody
      const filteredListTypes = place.types.filter((type) => {
        return !/point_of_interest|establishment|political/.test(type)
      })

      const createdPlace = await db
        .insert(places)
        .values({
          id: crypto.randomUUID(),
          name: place.name,
          description: '',
          address: place.address,
          googleMapsId: place.googleMapsId,
          types: filteredListTypes,
          imageUrl: place.imageUrl,
          location: [place.latitude, place.longitude],
          latitude: place.latitude,
          longitude: place.longitude,
          websiteUri: place.websiteUri,
          userId,
        })
        .returning()
        .then(takeUniqueOrThrow)

      await db
        .insert(item)
        .values(
          [...listIds].map((id) => ({
            id: crypto.randomUUID(),
            type: 'PLACE',
            itemId: createdPlace.id,
            listId: id,
            userId,
          }))
        )
        .onConflictDoNothing()

      const lists = await db.select().from(list).where(inArray(list.id, listIds))

      // 👇 Track place creation
      track(userId, EVENTS.PLACE_ADDED, {
        types: place.types,
      })

      server.log.info('place added to lists', {
        userId,
        placeId: createdPlace.id,
        listIds,
      })

      return { place: createdPlace, lists }
    }
  )

  server.delete(
    '/lists/:listId/place/:placeId',
    {
      schema: {
        params: {
          type: 'object',
          properties: {
            listId: { type: 'string' },
            placeId: { type: 'string' },
          },
          required: ['listId', 'placeId'],
        },
      },
    },
    async (request: FastifyRequest) => {
      const { userId } = request
      const { listId, placeId } = request.params as {
        listId: string
        placeId: string
      }

      await db
        .delete(item)
        .where(and(eq(item.listId, listId), eq(item.itemId, placeId), eq(item.type, 'PLACE')))

      server.log.info('place removed from list', {
        userId,
        placeId,
        listId,
      })

      return { success: true }
    }
  )

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
              ...types.location,
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
    async (request: FastifyRequest, reply) => {
      const { id } = request.params as { id: string }
      let photos: PhotoMedia[] | undefined
      let lists: { id: string; name: string }[] = []
      let place: typeof places.$inferSelect | FormattedPlace | null = null

      try {
        place = await db
          .select()
          .from(places)
          .where(eq(places.googleMapsId, id))
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

  server.get(
    '/places/between',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            origin: {
              type: 'object',
              properties: types.location,
              required: ['latitude', 'longitude'],
            },
            destination: {
              type: 'object',
              properties: types.location,
              required: ['latitude', 'longitude'],
            },
            travelMode: {
              type: 'string',
              enum: ['DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT'],
            },
          },
          required: ['origin', 'destination', 'travelMode'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                address: { type: 'string' },
                name: { type: 'string' },
                googleMapsId: { type: 'string' },
                ...types.location,
              },
              required: ['latitude', 'longitude', 'name', 'googleMapsId'],
            },
            maxItems: 5,
          },
        },
      },
    },
    async (request, reply) => {
      const { origin, destination, travelMode } = request.query as {
        origin: Location
        destination: Location
        travelMode: string
      }

      // Calculate midpoint between origin and destination
      const midpoint = {
        latitude: (origin.latitude + destination.latitude) / 2,
        longitude: (origin.longitude + destination.longitude) / 2,
      }

      // Calculate rough distance between points for search radius
      const radius =
        Math.sqrt(
          (origin.latitude - destination.latitude) ** 2 +
            (origin.longitude - destination.longitude) ** 2
        ) * 50000 // Convert to meters

      // Search for places near the midpoint using Google Places API
      const nearbySearchParams = new URLSearchParams({
        location: [midpoint.latitude, midpoint.longitude].join(','),
        radius: Math.min(radius, 50000).toString(),
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        key: process.env.GOOGLE_MAPS_API_KEY!,
      })
      const placesResponse = (await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${nearbySearchParams}`
      ).then((res) => res.json())) as {
        results: {
          name: string
          place_id: string
          vicinity: string
          geometry: {
            location: {
              lat: number
              lng: number
            }
          }
        }[]
      }

      const searchResults = placesResponse.results.map((place) => ({
        name: place.name,
        googleMapsId: place.place_id,
        address: place.vicinity,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
      }))

      // Get route between points to filter places
      const directionsParams = new URLSearchParams({
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: travelMode.toLowerCase(),
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        key: process.env.GOOGLE_MAPS_API_KEY!,
      })
      const route = (await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?${directionsParams}`
      ).then((res) => res.json())) as {
        routes: {
          legs: {
            steps: {
              start_location: { lat: number; lng: number }
            }[]
          }[]
        }[]
      }

      // Filter places that are roughly along the route path
      const places = searchResults
        .filter((place) => isPlaceAlongRoute(place, route.routes[0]))
        .slice(0, 5)

      // 4. Return top 5 places
      return reply.code(200).send(places)
    }
  )
}

export default PlacesPlugin

type PlacePostBody = {
  listIds: string[]
  place: Location & {
    name: string
    address: string
    imageUrl: string
    googleMapsId: string
    types: string[]
    websiteUri: string
  }
}

function isPlaceAlongRoute(
  place: { latitude: number; longitude: number },
  route: {
    legs: { steps: { start_location: { lat: number; lng: number } }[] }[]
  }
): boolean {
  // Maximum distance in kilometers that a place can be from the route
  const MAX_DISTANCE_KM = 2

  // Check if place is near any step in the route
  return route.legs.some((leg) =>
    leg.steps.some((step) => {
      const distance = getDistanceFromLatLonInKm(
        place.latitude,
        place.longitude,
        step.start_location.lat,
        step.start_location.lng
      )
      return distance <= MAX_DISTANCE_KM
    })
  )
}

// Helper function to calculate distance between two points using Haversine formula
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}
