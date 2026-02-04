import { z } from 'zod'

import { ItemSchema as DbItemSchema, ItemInsertSchema as DbItemInsertSchema } from '@hominem/db/schema/items'

export const itemSchema = DbItemSchema.extend({})

export const itemsAddToListSchema = DbItemInsertSchema.pick({
  listId: true,
  itemId: true,
  itemType: true,
}).extend({})

export const itemsRemoveFromListSchema = DbItemSchema.pick({
  listId: true,
  itemId: true,
}).extend({})

export const itemsGetByListIdSchema = z.object({
  listId: z.string().uuid(),
})
