import { z } from 'zod'

import { transactionSchema } from './finance.schema'
import { TransactionInsertSchema } from '@hominem/db/schema/finance'

export const transactionListSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
  account: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  description: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.array(z.string()).optional(),
  sortDirection: z.array(z.enum(['asc', 'desc'])).optional(),
})

export const transactionCreateSchema = TransactionInsertSchema.pick({
  accountId: true,
  amount: true,
  description: true,
  type: true,
  category: true,
}).extend({
  date: z.string().optional(),
})

const transactionUpdateDataSchema = transactionSchema
  .pick({
    accountId: true,
    amount: true,
    description: true,
    category: true,
    date: true,
    merchantName: true,
    note: true,
    tags: true,
    excluded: true,
    recurring: true,
  })
  .partial()

export const transactionUpdateSchema = z.object({
  id: z.string().uuid(),
  data: transactionUpdateDataSchema,
})

export const transactionDeleteSchema = transactionSchema.pick({
  id: true,
})
