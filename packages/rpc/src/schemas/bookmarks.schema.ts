import * as z from 'zod'

export const CreateBookmarkInputSchema = z.object({
  url: z.string().url('Invalid URL'),
  title: z.string().optional(),
  description: z.string().optional(),
  folder: z.string().optional(),
})

export const UpdateBookmarkInputSchema = z.object({
  url: z.string().url().optional(),
  title: z.string().optional().nullish(),
  description: z.string().optional().nullish(),
  folder: z.string().optional().nullish(),
})

export const ListBookmarksFilterSchema = z.object({
  folder: z.string().optional(),
  limit: z.number().int().min(1).default(50),
  offset: z.number().int().min(0).default(0),
})

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkInputSchema>
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkInputSchema>
export type ListBookmarksFilter = z.infer<typeof ListBookmarksFilterSchema>
