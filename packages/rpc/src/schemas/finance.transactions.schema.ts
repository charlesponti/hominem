import * as z from 'zod'

export const TransactionInsertSchema = z.object({
  userId: z.uuid(),
  accountId: z.uuid(),
  amount: z.number(),
  description: z.string().min(1),
  date: z.string(),
  type: z.enum(['income', 'expense', 'transfer']).optional(),
  tagIds: z.array(z.uuid()).optional(),
})

export const TransactionQueryFiltersSchema = z.object({
  accountId: z.uuid().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
  tagIds: z.array(z.uuid()).optional(),
  tagNames: z.array(z.string().min(1)).optional(),
})
