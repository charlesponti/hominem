import { google } from '@ai-sdk/google'
import { generateText, tool } from 'ai'
import { z } from 'zod'
import {
  get_performance_finances_by_id,
  get_performance_ticket_sales_by_id,
  get_performances,
} from '../tour.tools'

export async function eventInfoToolCall({ prompt }: { prompt: string }) {
  const response = await generateText({
    model: google('gemini-1.5-pro-latest', { structuredOutputs: true }),
    tools: {
      get_performances,
      get_performance_finances_by_id,
      get_performance_ticket_sales_by_id,
      answer: tool({
        description: 'A tool for providing the final answer.',
        parameters: z.object({
          steps: z.array(
            z.object({
              stepName: z.string(),
              stepArguments: z.any(),
            })
          ),
          answer: z.string(),
        }),
      }),
    },
    toolChoice: 'required',
    maxSteps: 10,
    system:
      'You are providing information about events. ' +
      'Use the appropriate tools to provide the user with the information they require about the event provided.' +
      'Provide detailed and accurate information.',
    prompt,
  })

  return response
}
