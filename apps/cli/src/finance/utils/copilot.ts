import { logger } from '@ponti/utils/logger'
import { db } from '../../db'
import { transactions } from '../../db/schema'

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

export async function processCopilotTransaction(data: CopilotTransaction): Promise<boolean> {
  try {
    // Validate required fields
    if (!data.date || !data.amount || !data.name) {
      logger.warn('Missing required fields', { data })
      return false
    }

    await db
      .insert(transactions)
      .values({
        date: data.date,
        name: data.name,
        amount: Number.parseFloat(data.amount),
        status: data.status,
        category: data.category,
        parentCategory: data['parent category'] || data.parent_category || '',
        excluded: data.excluded === 'true',
        tags: data.tags,
        type: data.type,
        account: data.account,
        accountMask: data['account mask'] || data.account_mask || '',
        note: data.note,
        recurring: data.recurring,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing()

    return true
  } catch (error) {
    logger.error('Error processing transaction', {
      error: error instanceof Error ? error.message : String(error),
      data,
    })
    return false
  }
}
