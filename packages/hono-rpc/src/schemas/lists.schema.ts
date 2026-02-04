import { z } from 'zod'

import { ListSchema as DbListSchema, UserListsSchema as DbUserListsSchema } from '@hominem/db/schema/lists'
import { ItemSchema as DbItemSchema } from '@hominem/db/schema/items'

export const listSchema = DbListSchema.extend({})

export type ListRecord = z.infer<typeof listSchema>

export const listGetAllSchema = z.object({
  itemType: z.string().optional(),
})

export const listGetByIdSchema = DbListSchema.pick({ id: true })

export const listCreateSchema = DbListSchema.pick({
  name: true,
  description: true,
  isPublic: true,
}).extend({
  isPublic: DbListSchema.shape.isPublic.optional(),
})

const listUpdateBaseSchema = DbListSchema.pick({
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

export const listDeleteSchema = DbListSchema.pick({ id: true })

export const listDeleteItemSchema = DbItemSchema.pick({
  listId: true,
  itemId: true,
}).extend({})

export const listGetContainingPlaceSchema = z.object({
  placeId: z.string().uuid().optional(),
  googleMapsId: z.string().optional(),
})

export const listRemoveCollaboratorSchema = DbUserListsSchema.pick({
  listId: true,
  userId: true,
}).extend({})
