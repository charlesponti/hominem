import { logger } from '@hominem/utils/logger'

/**
 * Parse a transaction from a string. (Keep if needed elsewhere, otherwise remove if unused)
 */
export function parseTransactionString(txString: string): {
  date: Date
  amount: string
  description: string
} {
  try {
    const data = JSON.parse(txString)
    return {
      date: new Date(data.date || Date.now()),
      amount: data.amount || '0',
      description: data.description || 'Unknown',
    }
  } catch (err) {
    logger.error('Failed to parse transaction string:', err)
    return {
      date: new Date(),
      amount: '0',
      description: 'Failed to parse transaction',
    }
  }
}
