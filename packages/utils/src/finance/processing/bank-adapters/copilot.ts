import crypto from 'node:crypto'
import { z } from 'zod'
import type { TransactionInsert } from '../../finance.types'

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

export function translateTransactionType(type: string): TransactionInsert['type'] {
  if (type === 'income') {
    return 'income'
  }

  if (type === 'internal transfer') {
    return 'transfer'
  }

  if (type === 'regular') {
    return 'expense'
  }

  return 'expense'
}

export function convertCopilotTransaction(
  data: CopilotTransaction,
  userId: string
): Omit<TransactionInsert, 'accountId'> {
  // Validate required fields exist
  if (!data.amount) {
    throw new Error('Missing required field: amount')
  }
  if (!data.date) {
    throw new Error('Missing required field: date')
  }
  if (!data.name) {
    throw new Error('Missing required field: name (description)')
  }
  if (!data.type) {
    throw new Error('Missing required field: type')
  }

  // Clean the amount field
  const cleanAmountString = data.amount.toString().replace(/[^0-9.-]/g, '')
  const type = translateTransactionType(data.type)

  // Validate that amount is a valid number
  const parsedAmount = Number.parseFloat(cleanAmountString)
  if (Number.isNaN(parsedAmount)) {
    throw new Error(`Invalid amount: "${data.amount}" could not be converted to a number`)
  }

  // Validate date
  const parsedDate = new Date(data.date)
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date: "${data.date}" could not be converted to a valid date`)
  }

  let finalAmount = parsedAmount

  if (type === 'income') {
    // If Copilot income is negative (as expected), make it positive
    if (finalAmount < 0) {
      finalAmount *= -1
    }
  } else {
    // 'expense' or 'transfer'
    // If Copilot expense/transfer is positive (as expected), make it negative
    if (finalAmount > 0) {
      finalAmount *= -1
    }
  }

  return {
    id: crypto.randomUUID(),
    type,
    amount: finalAmount.toFixed(2), // Convert back to string
    date: parsedDate, // Use the validated parsed date
    description: data.name,
    category: data.category,
    parentCategory: data['parent category'] || data.parent_category || '',
    excluded: data.excluded === 'true',
    tags: data.tags,
    status: data.status,
    accountMask: data['account mask'] || data.account_mask || '',
    note: data.note,
    recurring: data.recurring === 'false' ? false : !!data.recurring,
    userId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
