import { z } from 'zod'

export const ActionItemsSchema = z.object({
  todos: z.array(z.string()),
  commitments: z.array(z.string()),
  deadlines: z.array(z.string()),
})

export type ActionItems = z.infer<typeof ActionItemsSchema>
