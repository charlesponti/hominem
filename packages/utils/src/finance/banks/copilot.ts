import type { TransactionInsert } from '@/db/schema/finance.schema'
import { logger } from '@/logger'
import { createNewTransaction } from '@/finance/finance.service'

export interface CopilotTransaction {
  date: string
  name: string
  amount: string
  status: string
  category: string
  parent_category: string | null
  'parent category': string | null
  excluded: 'true' | 'false' | string
  tags: string
  type: string
  account: string
  account_mask: string | null
  'account mask': string | null
  note: string
  recurring: string
}

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

export function convertCopilotTransaction(data: CopilotTransaction) {
  // Clean the amount field - remove quotes and other non-numeric chars except decimal point
  const cleanAmount = data.amount.toString().replace(/[^0-9.-]/g, '')
  const type = translateTransactionType(data.type, Number.parseFloat(cleanAmount))

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
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function processCopilotTransaction(
  data: CopilotTransaction,
  accountId: string
): Promise<boolean> {
  try {
    // Validate required fields
    if (!data.date || !data.amount || !data.name) {
      logger.warn('Missing required fields', { data })
      return false
    }

    await createNewTransaction({
      ...convertCopilotTransaction(data),
      accountId,
    })

    return true
  } catch (error) {
    logger.error('Error processing transaction', {
      error: error instanceof Error ? error.message : String(error),
      data,
    })
    return false
  }
}
