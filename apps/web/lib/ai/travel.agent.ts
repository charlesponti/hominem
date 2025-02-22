import { google } from '@ai-sdk/google'
import { generateText, tool } from 'ai'
import { z } from 'zod'
import { get_location_info, get_driving_directions, get_weather } from './tools'

export async function travelAgent({ prompt }: { prompt: string }) {
  const response = await generateText({
    model: google('gemini-1.5-pro-latest', { structuredOutputs: true }),
    tools: {
      get_location_info,
      get_driving_directions,
      get_weather,
      answer: tool({
        description: 'A tool for providing the final answer.',
        parameters: z.object({
          steps: z.array(z.object({ stepName: z.string() })),
          answer: z.string(),
        }),
      }),
    },
    toolChoice: 'required',
    maxSteps: 10,
    system:
      'You are providing information about cities. ' +
      'Use the appropriate tools to provide the user with the information they require about the location provided.' +
      'Provide detailed and accurate information.',
    prompt,
  })

  return response
}
