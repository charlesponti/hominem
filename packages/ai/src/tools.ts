import { tool } from 'ai'
import { z } from 'zod'

export const get_location_info = tool({
  description: 'A tool for getting information about a city.',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }: { city: string }) => {
    return `Information about ${city}`
  },
})

export const get_driving_directions = tool({
  description: 'A tool for getting driving directions to a city.',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }: { city: string }) => {
    return `Driving directions to ${city}`
  },
})

export const get_weather = tool({
  description: 'A tool for getting the current weather in a city.',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }: { city: string }) => {
    return `Current weather in ${city}`
  },
})
