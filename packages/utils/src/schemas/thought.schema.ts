import { z } from 'zod'

export const ThoughtSchema = z
  .object({
    type: z.string().describe('Type of thought'),
    description: z.string().describe('the thought mentioned'),
  })
  .describe('thoughts that the person had')

export const ThoughtsSchema = z.array(ThoughtSchema)
export type Thoughts = z.infer<typeof ThoughtsSchema>
