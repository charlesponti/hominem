import { openai } from '@ai-sdk/openai'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { get_location_info } from './tools'

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
      get_location_info,
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
