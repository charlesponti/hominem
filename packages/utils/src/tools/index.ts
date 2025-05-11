import { openai } from '@ai-sdk/openai'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { tools as financeTools } from '../finance/finance.tools'
import * as bookmarkTools from './bookmarks.tools'
import * as careerTools from './career.tools'
import * as generalTools from './general'
import * as healthTools from './health.tools'
import * as listTools from './lists.tools'
import * as locationTools from './location.tools'
import * as placeTools from './place.tools'
import * as taskTools from './task.tools'
import * as travelTools from './travel.tools'
import * as userTools from './user.tools'

// General tools
export * from './general'

// Location tools
export * from './location.tools'

// Task management tools
export * from './task.tools'

// User management tools
export * from './user.tools'

// Job application tools
export * from './career.tools'

// Bookmark tools
export * from './bookmarks.tools'

// List management tools
export * from './lists.tools'

// Place management tools
export * from './place.tools'

// Health tracking tools
export * from './health.tools'

// Travel management tools
export * from './travel.tools'

// Content generation tools
export * as contentTools from './content.tools'

// Grouped collections
export const productivityTools = {
  ...taskTools,
  ...listTools,
}

export const userManagementTools = {
  ...userTools,
}

export const locationBasedTools = {
  ...locationTools,
  ...placeTools,
}

export const lifestyleTools = {
  ...careerTools,
  ...healthTools,
  ...bookmarkTools,
}

type TravelPlanningTools = typeof travelTools & typeof locationTools
export const travelPlanningTools: TravelPlanningTools = {
  ...travelTools,
  ...locationTools,
}

// Full collection of all tools
export const allTools = {
  ...generalTools,
  ...taskTools,
  ...userTools,
  ...careerTools,
  ...financeTools,
  ...bookmarkTools,
  ...listTools,
  ...placeTools,
  ...healthTools,
  ...travelPlanningTools,
}

export async function getAnswer({ prompt }: { prompt: string }) {
  const response = await generateObject({
    model: openai('gpt-4o-mini', { structuredOutputs: true }),
    prompt,
    schema: z.object({
      answer: z.number(),
    }),
  })

  return response
}

export const getCityInfo = async ({ city }: { city: string }) => {
  const response = await generateText({
    model: openai('gpt-4o-mini', { structuredOutputs: true }),
    prompt: 'Get information about a city',
    tools: {
      get_location_info: locationTools.get_location_info,
    },
    messages: [
      {
        role: 'user',
        content: `Get information: ${city}`,
      },
    ],
  })

  return response
}
