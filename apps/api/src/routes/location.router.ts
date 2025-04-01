import { formatGeocodeFeatures, type Geocoding, LAYERS } from '@ponti/utils/location'
import type { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'

const locationPlugin: FastifyPluginAsync = async (server: FastifyInstance) => {
  server.get('/geocode', async (request, reply) => {
    const { query } = request.query as { query?: string }

    if (!query) {
      return reply.code(400).send({ error: 'Missing query parameter' })
    }

    try {
      const { GEOCODE_EARTH_API_KEY } = process.env

      if (!GEOCODE_EARTH_API_KEY) {
        throw new Error('Missing GEOCODE_EARTH_API_KEY')
      }

      const searchParams = new URLSearchParams({
        api_key: GEOCODE_EARTH_API_KEY,
        layers: LAYERS.join(','),
        'boundary.country': 'USA',
        text: query,
      })
      const response = await fetch(
        `https://api.geocode.earth/v1/autocomplete?${searchParams.toString()}`
      )

      const results = (await response.json()) as Geocoding

      return reply.code(200).send(formatGeocodeFeatures(results))
    } catch (error) {
      request.log.error('Error fetching city lat/lng:', error)
      return reply.code(500).send({ error: 'Error fetching city lat/lng' })
    }
  })
}

export default fp(locationPlugin)
