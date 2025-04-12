import { tool } from 'ai'
import { z } from 'zod'

export const get_location_info = tool({
  description: 'Get information about a city or location.',
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }: { location: string }) => {
    return `Information about ${location}`
  },
})

export const get_driving_directions = tool({
  description: 'Get driving directions to a location.',
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }: { location: string }) => {
    return `Driving directions to ${location}`
  },
})

export const get_weather = tool({
  description: 'Get the current weather in a location.',
  parameters: z.object({ location: z.string() }),
  execute: async ({ location }: { location: string }) => {
    return `Current weather in ${location}`
  },
})
