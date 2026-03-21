import * as z from 'zod'

export const listSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable().default(null),
  ownerId: z.string().uuid(),
  isPublic: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ListRecord = z.infer<typeof listSchema>

export const listGetAllSchema = z.object({
  itemType: z.string().optional(),
})

export const listGetByIdSchema = z.object({
  id: z.string().uuid(),
})

export const listCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
})

export const listUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
})

export const listDeleteSchema = z.object({
  id: z.string().uuid(),
})

export const listDeleteItemSchema = z.object({
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
})

export const listGetContainingPlaceSchema = z.object({
  placeId: z.string().uuid().optional(),
  googleMapsId: z.string().optional(),
})

export const listRemoveCollaboratorSchema = z.object({
  listId: z.string().uuid(),
  userId: z.string().uuid(),
})
