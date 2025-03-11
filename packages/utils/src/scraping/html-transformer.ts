import { google as googleAi } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import type { z } from 'zod'

export async function transformHTMLToSchema<T extends z.ZodObject<z.ZodRawShape, 'strip'>>(
  html: string,
  schema: T,
  model: 'openai' | 'google' = 'openai'
): Promise<{
  object: z.infer<T>
  duration: number
}> {
  const startTime = Date.now()
  const response = await generateObject({
    model: {
      openai: openai('gpt-4o', { structuredOutputs: true }),
      google: googleAi('gemini-1.5-flash-8b-latest', { structuredOutputs: true }),
    }[model],
    prompt: `
        Transform the following input into structured data. Your responses should be concise, accurate, and match the provided schema.

        ## input
        ${html}
      `,
    schema,
    mode: 'json',
  })
  const duration = Date.now() - startTime
  return {
    object: response.object as z.infer<T>,
    duration,
  }
}
