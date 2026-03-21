import * as z from 'zod'

const ConditionSchema = z.enum(['new', 'excellent', 'good', 'fair', 'poor'])

export const CreatePossessionInputSchema = z.object({
  name: z.string().min(1, 'Possession name is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  condition: ConditionSchema.optional(),
  location: z.string().optional(),
  containerId: z.string().uuid().optional(),
})

export const UpdatePossessionInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullish(),
  category: z.string().optional().nullish(),
  condition: ConditionSchema.optional().nullish(),
  location: z.string().optional().nullish(),
  containerId: z.string().uuid().optional().nullish(),
})

export const CreateContainerInputSchema = z.object({
  name: z.string().min(1, 'Container name is required'),
  description: z.string().optional(),
})

export const UpdateContainerInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullish(),
})

export const ListPossessionsFilterSchema = z.object({
  category: z.string().optional(),
  condition: ConditionSchema.optional(),
  containerId: z.string().uuid().optional(),
  limit: z.number().int().min(1).default(50),
  offset: z.number().int().min(0).default(0),
})

export type Condition = z.infer<typeof ConditionSchema>
export type CreatePossessionInput = z.infer<typeof CreatePossessionInputSchema>
export type UpdatePossessionInput = z.infer<typeof UpdatePossessionInputSchema>
export type CreateContainerInput = z.infer<typeof CreateContainerInputSchema>
export type UpdateContainerInput = z.infer<typeof UpdateContainerInputSchema>
export type ListPossessionsFilter = z.infer<typeof ListPossessionsFilterSchema>
