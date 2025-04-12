import { tool } from 'ai'
import { z } from 'zod'

export const create_place = tool({
  description: 'Create a new place',
  parameters: z.object({
    name: z.string().describe('Name of the place'),
    description: z.string().optional().describe('Description of the place'),
    address: z.string().optional().describe('Address of the place'),
    latitude: z.number().describe('Latitude coordinate'),
    longitude: z.number().describe('Longitude coordinate'),
    types: z.array(z.string()).optional().describe('Types/categories of the place'),
    isPublic: z.boolean().optional().describe('Whether the place is public'),
    bestFor: z.string().optional().describe('What the place is best for (e.g., "breakfast")'),
    wifiInfo: z
      .object({
        network: z.string(),
        password: z.string(),
      })
      .optional()
      .describe('WiFi information for the place'),
  }),
  async execute(args) {
    return {
      message: `Created place: ${args.name} at (${args.latitude}, ${args.longitude})`,
    }
  },
})

export const get_places = tool({
  description: 'Get all places or search for specific places',
  parameters: z.object({
    query: z.string().optional().describe('Search query for places'),
    types: z.array(z.string()).optional().describe('Filter by place types'),
    bestFor: z.string().optional().describe('Filter by what the place is best for'),
    nearby: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        radiusKm: z.number(),
      })
      .optional()
      .describe('Find places near a location'),
  }),
  async execute(args) {
    return {
      message: `Retrieved places${args.query ? ` with query: ${args.query}` : ''}${
        args.types ? ` of types: ${args.types.join(', ')}` : ''
      }${args.bestFor ? ` best for: ${args.bestFor}` : ''}${
        args.nearby ? ` near (${args.nearby.latitude}, ${args.nearby.longitude})` : ''
      }`,
    }
  },
})

export const update_place = tool({
  description: 'Update a place',
  parameters: z.object({
    placeId: z.string().describe('ID of the place to update'),
    name: z.string().optional().describe('New name for the place'),
    description: z.string().optional().describe('New description for the place'),
    address: z.string().optional().describe('New address for the place'),
    isPublic: z.boolean().optional().describe('Whether the place is public'),
    bestFor: z.string().optional().describe('What the place is best for'),
    wifiInfo: z
      .object({
        network: z.string(),
        password: z.string(),
      })
      .optional()
      .describe('WiFi information for the place'),
  }),
  async execute(args) {
    return {
      message: `Updated place ${args.placeId}`,
    }
  },
})

export const delete_place = tool({
  description: 'Delete a place',
  parameters: z.object({
    placeId: z.string().describe('ID of the place to delete'),
  }),
  async execute(args) {
    return {
      message: `Deleted place ${args.placeId}`,
    }
  },
})
