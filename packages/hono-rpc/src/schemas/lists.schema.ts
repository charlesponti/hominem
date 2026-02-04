import { z } from 'zod'

import { ListInsertSchema as DbListInsertSchema, UserListsInsertSchema as DbUserListsInsertSchema } from '@hominem/db/schema/lists'
import { ItemSchema as DbItemSchema } from '@hominem/db/schema/items'

export const listSchema = DbListInsertSchema.extend({})

export type ListRecord = z.infer<typeof listSchema>

export const listGetAllSchema = z.object({
  itemType: z.string().optional(),
})

export const listGetByIdSchema = DbListInsertSchema.pick({ id: true })

export const listCreateSchema = DbListInsertSchema.pick({
  name: true,
  description: true,
  isPublic: true,
}).extend({
  isPublic: DbListInsertSchema.shape.isPublic.optional(),
})

const listUpdateBaseSchema = DbListInsertSchema.pick({
  id: true,
  name: true,
  description: true,
  isPublic: true,
})

export const listUpdateSchema = listUpdateBaseSchema.extend({
  name: listUpdateBaseSchema.shape.name.optional(),
  description: listUpdateBaseSchema.shape.description.optional(),
  isPublic: listUpdateBaseSchema.shape.isPublic.optional(),
})

export const listDeleteSchema = DbListInsertSchema.pick({ id: true })

export const listDeleteItemSchema = DbItemSchema.pick({
  listId: true,
  itemId: true,
}).extend({})

export const listGetContainingPlaceSchema = z.object({
  placeId: z.string().uuid().optional(),
  googleMapsId: z.string().optional(),
})

export const listRemoveCollaboratorSchema = DbUserListsInsertSchema.pick({
  listId: true,
  userId: true,
}).extend({})
