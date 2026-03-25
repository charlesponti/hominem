import * as z from 'zod'

export const CreateTagInputSchema = z.object({
  name: z.string().min(1, 'Tag name is required'),
  color: z.string().optional(),
  description: z.string().optional(),
  emojiImageUrl: z.string().url().optional(),
})

export const UpdateTagInputSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().optional().nullish(),
  description: z.string().optional().nullish(),
  emojiImageUrl: z.string().url().optional().nullish(),
})

export const TaggingInputSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID'),
  entityId: z.string().uuid('Invalid entity ID'),
  entityType: z.string().min(1, 'Entity type is required'),
})

export const TagSyncInputSchema = z.object({
  entityId: z.string().uuid('Invalid entity ID'),
  entityType: z.string().min(1, 'Entity type is required'),
  tagIds: z.array(z.uuid()).default([]),
})

export type CreateTagInput = z.infer<typeof CreateTagInputSchema>
export type UpdateTagInput = z.infer<typeof UpdateTagInputSchema>
export type TaggingInput = z.infer<typeof TaggingInputSchema>
export type TagSyncInput = z.infer<typeof TagSyncInputSchema>
