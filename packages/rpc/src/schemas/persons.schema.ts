import * as z from 'zod'

const PersonTypeSchema = z.enum(['individual', 'organization', 'household'])

export const CreatePersonInputSchema = z.object({
  personType: PersonTypeSchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

export const UpdatePersonInputSchema = z.object({
  personType: PersonTypeSchema.optional(),
  firstName: z.string().optional().nullish(),
  lastName: z.string().optional().nullish(),
  email: z.string().email().optional().nullish(),
  phone: z.string().optional().nullish(),
  notes: z.string().optional().nullish(),
})

export const AddPersonRelationInputSchema = z.object({
  relatedPersonId: z.string().uuid('Invalid person ID'),
  relationType: z.string().min(1, 'Relation type is required'),
})

export const ListPersonRelationsFilterSchema = z.object({
  limit: z.number().int().min(1).default(50),
  offset: z.number().int().min(0).default(0),
})

export type PersonType = z.infer<typeof PersonTypeSchema>
export type CreatePersonInput = z.infer<typeof CreatePersonInputSchema>
export type UpdatePersonInput = z.infer<typeof UpdatePersonInputSchema>
export type AddPersonRelationInput = z.infer<typeof AddPersonRelationInputSchema>
export type ListPersonRelationsFilter = z.infer<typeof ListPersonRelationsFilterSchema>
