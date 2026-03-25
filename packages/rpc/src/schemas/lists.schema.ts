import * as z from 'zod'

export const listSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  description: z.string().nullable().default(null),
  ownerId: z.uuid(),
  isPublic: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ListRecord = z.infer<typeof listSchema>

export const listGetAllSchema = z.object({
  itemType: z.string().optional(),
})

export const listGetByIdSchema = z.object({
  id: z.uuid(),
})

export const listCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
})

export const listUpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
})

export const listDeleteSchema = z.object({
  id: z.uuid(),
})

export const listDeleteItemSchema = z.object({
  listId: z.uuid(),
  itemId: z.uuid(),
})

export const listGetContainingPlaceSchema = z.object({
  placeId: z.uuid().optional(),
  googleMapsId: z.string().optional(),
})

export const listRemoveCollaboratorSchema = z.object({
  listId: z.uuid(),
  userId: z.uuid(),
})
