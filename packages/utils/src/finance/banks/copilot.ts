import crypto from 'node:crypto'
import { z } from 'zod'
import type { TransactionInsert } from '../types'

export const CopilotTransactionSchema = z.object({
  date: z.string(),
  name: z.string(),
  amount: z.string(),
  status: z.string(),
  category: z.string(),
  parent_category: z.string().nullable(),
  'parent category': z.string().nullable(),
  excluded: z.union([z.literal('true'), z.literal('false'), z.string()]),
  tags: z.string(),
  type: z.string(),
  account: z.string(),
  account_mask: z.string(),
  'account mask': z.string(),
  note: z.string(),
  recurring: z.string(),
})
export type CopilotTransaction = z.infer<typeof CopilotTransactionSchema>

export function translateTransactionType(type: string, amount: number): TransactionInsert['type'] {
  if (type === 'regular' && amount > 0) {
    return 'income'
  }

  if (type === 'internal transfer') {
    return 'transfer'
  }

  if (type === 'regular' && amount < 0) {
    return 'expense'
  }

  return 'expense'
}

export function convertCopilotTransaction(
  data: CopilotTransaction,
  userId: string
): Omit<TransactionInsert, 'accountId'> {
  // Clean the amount field - remove quotes and other non-numeric chars except decimal point
  const cleanAmount = data.amount.toString().replace(/[^0-9.-]/g, '')
  const type = translateTransactionType(data.type, Number.parseFloat(cleanAmount))

  // Validate that amount is a valid number
  if (Number.isNaN(cleanAmount)) {
    throw Error('Invalid amount')
  }

  return {
    id: crypto.randomUUID(),
    type,
    amount: data.amount,
    date: new Date(data.date),
    description: data.name,
    category: data.category,
    parentCategory: data['parent category'] || data.parent_category || '',
    excluded: data.excluded === 'true',
    tags: data.tags,
    status: data.status,
    accountMask: data['account mask'] || data.account_mask || '',
    note: data.note,
    recurring: !!data.recurring,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
