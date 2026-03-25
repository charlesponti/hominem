import * as z from 'zod'

export const itemSchema = z.object({
  id: z.uuid(),
  listId: z.uuid(),
  itemId: z.uuid(),
  itemType: z.enum(['PLACE', 'FLIGHT', 'TASK']).default('TASK'),
})

export const itemsAddToListSchema = itemSchema.pick({
  listId: true,
  itemId: true,
  itemType: true,
})

export const itemsRemoveFromListSchema = itemSchema.pick({
  listId: true,
  itemId: true,
})

export const itemsGetByListIdSchema = z.object({
  listId: z.uuid(),
})
